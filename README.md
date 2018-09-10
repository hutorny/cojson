## cojson v2.0
 C++ pull-type `JSON` parser/generator for constrained platforms with automated 
 code generation.
 
 Please visit [`changelog.v2.0.md`](https://github.com/hutorny/cojson/blob/master/changelog.v2.0.md)
 to read about changes introduced in *v2.0* 

### COJSON Introduction

`cojson` is a C++ pull-type `JSON` parser/serializer for constrained platforms,
such as bare metal applications on low-end MCUs. It does not use memory 
allocation and has almost no external dependencies. It is not intrusive - it 
neither forces nor implies any particular design of the application. 
Instead it adapts to fit any existing application code. 
It is tolerant to data type mismatching. When such occurs, parser just skips 
mismatching data and makes best efforts to continue parsing. 

The parser is recursive, e.g. nested `JSON` elements are handled with the 
recursion. However, this recursion is driven by the structure definition, not by
the input data, which prevents stack faults on malformed input data.

`cojson` is character type neutral - it can work with signed or unsigned 
character, as well as with standard wide character types: 
*`wchar_t`*, *`char16_t`* and *`char32_t`*. 

It is also transparent for `UTF8` and properly handles `BOM` sequence.

`cojson` works against a user-defined structure which specifies hierarchy, 
data types, and data storage access methods. Thus, when parsing is complete, 
the data already delivered to the application and no further processing needed.

The same structure definition is also used for writing `JSON`.
The `JSON` structure is defined with a set of templetized functions. 

Please visit project's [`home page`](http://hutorny.in.ua/projects/cojson) 
and [`tutorial`](http://hutorny.in.ua/projects/cojson-tutorial) for more details

### Code generation

Starting from *v2.0* `cojson` facilitates generation of `C++` code from a `JSON` sample.

Online version is available at [`this link`](http://hutorny.in.ua/codegen/cojson.html)
For more details please visit [codegen](https://github.com/hutorny/cojson/tree/master/tools/codegen/)
directory in this repository.

### Requirements

* **Compiler:** cojson sources need a `C++11` enabled compiler, such as 
   `g++-4.9` and up.
* **Library:** `libstdc++ v3` highly desirable. But if not available a 
    workaround exists
* **Code space:** Depending on the platform and `JSON` structure complexity 
    varies from 4kB to 20kB.
* **RAM space:** 20-80 bytes per entry in the defined `JSON` structure

### Tested On
* **Debian** `i686`, `g++-4.9.2`
* **Debian** `i686`, `g++-7.1.0`
* **Debian** `x64`, `g++-6.3.0`
* **Arduino Mega** `ATmega2560`, `avr-g++-4.9.2`
* **Arduino Mega** `ATmega2560`, `avr-g++-5.4.0`
* **Teensy 3.1** `ARM Cortex-M4` `arm-none-eabi-g++-4.8.4`
* **Carambola2** `Atheros AR9331` `mips-openwrt-linux-g++-4.8.3`
* **MSP430FR6989** `MSP430FR6989` `msp430-elf-g++-4.9.1`
* **NodeMCU V3** `ESP8266` `xtensa-lx106-elf-g++-4.8.5`

