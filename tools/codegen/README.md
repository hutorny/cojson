## `codegen` - *COJSON* Code Generation utility

This utility generates C++ classes for parsing/writing *JSON* using a sample *JSON* file as input.
<br>It comes in two flavors: web based and command line.
<br>Please visit [home page](http://hutorny.in.ua/projects/cojson) 
and [tutorial](http://hutorny.in.ua/projects/cojson-tutorial) for more details about *COJSON*.

### 1. Web based `codegen`  

#### 1.1. Online version
Online version is available at [`this link`](https://hutorny.in.ua/codegen/cojson.html) 

#### 1.2. Installation
To install web based `codegen` at local facilities 
 
* Obtain a copy of `cojson codegen`  
```
  $ svn export https://github.com/hutorny/cojson/trunk/tools/codegen
```
* Install ACE
```
  $ cd codegen
  $ svn export https://github.com/ajaxorg/ace-builds/trunk/src ace
  $ cd ace
  $ ln -s ../js/mode-hpp.js
```
* Publish *codegen* directory with your favorite HTTP server

#### 1.3. Usage

* Open `codegen/cojson.html` in a browser
* Type or paste a *JSON* sample in the left area
* When done, click **Run** button
* Review results in the right area
* If necessary, adjust options
* Copy results from the right area or click **Save to...** button

### 2. Command line `codegen`

#### 2.1. Installation
To install command line `codegen` at local facilities 
 
* Install Node JS (please follow instructions given on this [page](https://nodejs.org/uk/download/package-manager/)
* Obtain a copy of `cojson codegen`  
```
 	svn export https://github.com/hutorny/cojson/tools/codegen
```
* Install dependencies  
```
	cd codegen/js
	npm install
```

#### 2.2. Usage

* Run `codegen` and supply an input *JSON* file or feed *JSON* data via stdin
* To save the results , redirect stdout to a file

### 3. Options

* **Variant** (`--variant`)<br>&mdash; Specifies a variant for the code generation:
  * **variables** &mdash; Maps JSON values to C/C++ variables. Lists and objects are flattened.Suitable for small JSON structures
  * **functions** &mdash; Maps scalar JSON values to functions X_get X_set. Strings are mapped to variables
  * **members**   &mdash; Generates classes and maps JSON values to the class members
  * **methods**   &mdash; Generates classes and maps scalar JSON values to the class methods. Strings and vectors are mapped to members-arrays
  * **stdlib**    &mdash; Generates classes and strings and vectors are mapped to members of `std::string` and `std::vector` types
* **Compact** (`--compact`)<br>&mdash; Generates compact code, e.g. uses short names `V`, `M`, `P` instead of full names `Value...`,  `Member...`, `Property...`
* **Application namespace** (`--namespace`)<br>&mdash; Specifies name of the top level application's namespace.  
* **Name namespace** (`--name`)<br>&mdash; Specifies namespace for wrapping name functions
* **Class name** (`--classname`)<br>&mdash; Sets the class name for the root object when style is members or  methods 
* **Example** (`--example`)<br>&mdash; Generates and example for reading *JSON* from *stdin* and writing to *stdout* 
  