## cojson change log v2.0

### Major changes

* Code generation facilities [`codegen`](https://github.com/hutorny/cojson/tree/master/tools/codegen/) for easy start
* Short functions (*V*, *M*, *P* etc) are only aliasing functions with 
  long names (*details::Value...*, *details::Member...*,  *details::Propery...*)     
* Added support for `std::vector` and `std::string` (enabled with header `cojson_stdlib.hpp`)
* Added wrappers for `std::istream` and `std::ostream` (defined in `cojson_stdlib.hpp`)
* Application configuration is based on [*CCS*](http://hutorny.in.ua/research/cascaded-configuration-sets-for-c1y)

### Minor changes
`ADD:` support for null instead of a string
<br>`ADD:` iostream wrapper for a a memory buffer `cojson::wrapper::memstream 
<br>`ADD:` empty objects/arrays to ignore pieces in the input
<br>`ADD:` handling of escaped slash
<br>`ADD:` cojson::Read/Write template functions
<br>`ADD:` Support for empty ValueObject, ValueAray, added PropertyList
<br>`ADD:` Strings for serializing read-only vector of strings, accessible via function F
<br>`ADD:` Vector of strings and external value as a property of a class
<br>`ADD:` External/static JSON array (heterogeneous list), associated with a C object
<br>`ADD:` reader/writer via class methods
<br>`ADD:` esp8266 test environment
<br>`MOD:` increased default precision for float-to-string conversion
<br>`MOD:` fixed bug with JSON 4HEXDIG
<br>`MOD:` fixed PropertyConstString to accept cstring 
<br>`MOD:` fixed null pointer accessing with PropertyString* 
<br>`MOD:` refactored headers to use pragma once instead of guards
<br>`MOD:` made progmem use for mega tests that have not used it yet
<br>`FIX:` hexadecimal representation when char is not unsigned
 