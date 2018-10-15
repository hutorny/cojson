## cojson change log v2.1

### Major changes

* Implemented support for `auto` template parameters and argument deduction. 
  Enabled with  cojson_autos.hpp and GCC v.7 or higher
* Added cojson::operators for reading with operator>> and writing with operator<<   
* Added COJSON Tutorial for C++17

### Minor changes
`ADD` PropertyCstring read-only string via getter 
<br>`MOD` Added guard in default reader for comprehensive error message when a 
     non-numeric type is used
<br>`MOD:` `accessor::methods` is made nullptr safe
<br>`MOD` PropertyConstString to accept const member
<br>`FIX` Ambiguous `cojson::wrapper::istream:error`
<br>`FIX` Build tests for `Teensy3.1` with `Teensyduino v1.44` and
    `arm-none-eabi-g++ v.5.4.1`
<br>`FIX` Regression with float conversion 
<br>`FIX` Tests' build errors with `c++17`
<br>`FIX` Build errors on older and exotic compilers
<br>`FIX` Clearing vector and string before reading
  