###cojson rev2

`ADD`: floating::serialize as a replacement for sprintf("%g")<br/>
`ADD`: configurable write double implementation<br/>
`ADD`: test 100.cpp for testing floating::serialize<br/>
`ADD`: test with sprintf<br/>
`ADD`: mbed example<br/>
`ADD`: all tests buildable for msp430fr<br/>
`MOD`: made member::match weak for easier substituting<br/>
`MOD`: internal exp_10 to cycle by 1e6 and switch<br/>
`MOD`: added teensy3a goal<br/> 
`MOD`: goal megaa +2 tests (100 and 101)<br/>
`MOD`: goal pic32mx +1 test (100)<br/>
`MOD`: file specific compilation flags<br/>
`FIX`: wrong detection of sprintf<br/>
