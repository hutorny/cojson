/*
 * curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
 * sudo apt-get install -y nodejs
 * npm install command-line-args command-line-usage
 */

/*jshint esversion: 6, expr: true , curly: false  */
const CojsonGenerator = require('./tools.js');
const fs = require('fs');
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const optionDefinitions = [
  { name: 'src', type: String, alias: 's', defaultOption: true,
	typeLabel: '{italic input_file}', 
	description: 'Specifies input file with a JSON sample. Default is stdin' },
  { name: 'variant', alias: 'v', type: String,
	typeLabel: '{italic variant}', defaultValue: 'default',
	description: 'selects a variant for code generation: {bold variables}|{bold functions}|{bold members}|{bold methods}'
		+ '|{bold stdlib} default is members, run --help variants for more information' },
  { name: 'variables', alias: 'V', type: Boolean, description: 'same as --variant=variables' },
  { name: 'functions', alias: 'F', type: Boolean, description: 'same as --variant=functions' },
  { name: 'members',   alias: 'M', type: Boolean, description: 'same as --variant=members' },
  { name: 'methods',   alias: 'G', type: Boolean, description: 'same as --variant=methods' },
  { name: 'stdlib',    alias: 'S', type: Boolean, description: 'same as --variant=stdlib' },
  { name: 'classname', alias: 'c', type: String,
	typeLabel: '{italic classname}', defaultValue: 'MyClass',
	description: 'sets class name for the root object when style is {bold members} or {bold  methods}, default is {bold MyClass}' },
  { name: 'namespace', alias: 'n', type: String,
	typeLabel: '{italic namespace}', defaultValue: 'MyApp',
	description: 'sets namespace for wrapping the generated code, default is {bold MyApp}' },
  { name: 'name', type: String,
	typeLabel: '{italic name}',
	description: 'sets namespace for wrapping name functions, default is {bold name}' },
  { name: 'compact', alias: 'C', type: Boolean,
	description: 'generates compact code - uses V, M instead of Value... and Member...' },	
  { name: 'avr', type: Boolean,
	description: 'Places code names in progmem space (AVR MCUs only)' },	
  { name: 'encoding', alias: 'e', type: String,
	typeLabel: '{italic encoding}', defaultValue: 'UTF-8',
	description: 'sets encoding for input data, default is UTF-8' },	
  { name: 'writejson', alias: 'j', type: Boolean,
	description: 'write input JSON as comments to the output' },	
  { name: 'prefix', alias: 'p', type: String,
	description: 'prepend prefix before function or variable declaration, for example {italic extern}' },	
  { name: 'suffix', alias: 'u', type: String,
	description: 'append suffix prefix after function, variable, or method declaration, for example {italic noexcept}' },	
  { name: 'example', type: Boolean, 
	description: 'Generate an example on reading and writing JSON' },
  { name: 'min_strlen', type: Number, 
	description: 'sets minimal length for string variables/members' },
  { name: 'verbose', type: Boolean, 
	description: 'Verbose messaging (INFO, WARN, ERR)' },
  { name: 'quiet', type: Boolean, 
	description: 'Less messaging (ERR)' },
  { name: 'options', alias: 'i', type: String, 
	typeLabel: '{italic options_file}', 
	description: 'Specifies a JSON file with options, run --help options to get an example' },
  { name: 'help', alias: '?', type: Boolean,	
	description: 'Print this help' }
];

const chalk = require('command-line-usage/lib/chalk-format');

const usageSections = [ {
	header: 'codegen - COJSON Code Generator',
    content: 'generates C++ classes for parsing/writing JSON using a given input as JSON sample'    	
},{
    header: 'Options',
    optionList: optionDefinitions
} ];

const help_variants = `
{italic Variants definitions}
{bold variables} - Maps JSON values to C/C++ variables. Lists and objects are flattened. 
            Suitable for small JSON structures
{bold functions} - Maps scalar JSON values to functions {italic X}_get {italic X}_set. 
            Strings are mapped to variables
{bold members}   - Generates classes and maps JSON values to the class members
{bold methods}   - Generates classes and maps scalar JSON values to the class methods. 
            Strings and vectors are mapped to members    
{bold stdlib}    - Generates classes and strings and vectors are mapped to members 
            of std::string and std::vector type`;    

const usage = commandLineUsage(usageSections);
optionDefinitions.push({"name" : "test", "type" : Boolean});
const options = commandLineArgs(optionDefinitions);

var Options = { 
		style			: 'variables', 
		suffix 			: '', 
		classname		: 'MyClass', 
		min_strlen		: 32,
		compact			: false,
		namespace		: 'MyApp', 
	};

class CodeGen {		
	constructor() {
		this.exec =  options.help ? this.help : this.generate;
		this.istty = Boolean(process.stdin.isTTY);
		this.input = process.stdin;
		var variant = (options.variables << 0)|(options.functions << 1)|(options.members << 2)|(options.methods << 3)|(options.stdlib << 4); //jshint ignore:line		
		if( ! [0,1,2,4,8,16].includes(variant) || (variant !== 0 && options.variant !== 'default')) {
			console.error('Error: multiple variants specified');
			this.exec = this.invalid;
		}
		if( variant ) {
			variant = (options.variables * 0)|(options.functions * 1)|(options.members * 2)|(options.methods * 3)|(options.stdlib * 4);  //jshint ignore:line
			options.variant = CojsonGenerator.Variants[variant];
		} else {
			if( options.variant === 'default' ) options.variant = 'members';
		}
	}
	invalid() {
		return 2;
	}
	help() {
		switch( options.src ) {
		case 'variants':
			console.log(chalk(help_variants));
			return 3;
		case 'options':
			console.log(JSON.stringify(CojsonGenerator.Options, null, "  "));
			return 0;
		default:
			console.log(usage);
		}
		return 3;
	}
	generate() {
		var json, opts;
		if( ! options.src && (options.verbose || (process.argv.length <= 2 && this.istty))  ) {
			console.warn('Reading JSON sample from stdin');
		}
		if( options.options ) try {
			 opts = fs.readFileSync(options.options,options.encoding);
			 opts = JSON.parse(opts);
			 Object.keys(options).forEach((v)=>opts[v] = options[v]);
		} catch(e) {
			console.error(e.message);
			return 1;			
		}
		if( options.src ) try {
			json = fs.readFileSync(options.src,options.encoding);
		} catch(e) {
			console.error(e.message);
			return 1;			
		} else {
			process.stdin.resume();
			json = fs.readFileSync('/dev/stdin',options.encoding);
			process.stdin.pause();
		}
		
		if( ! json ) {
			console.info('No data');			
			return 4;
		}
		try {
			json = json.toString();
			options.rethrow = true;
			var cpp = CojsonGenerator.fromText(json, opts || options);
			if( options.outputfile ) {
				fs.writeFileSync(options.outputfile, cpp, options.encoding);
			} else {
				//fs.writeSync(process.stdout.fd,cpp); // this has flushing issues
				console.log(cpp);
			}
		} catch(e) {
			console.error(e.message);			
			console.info(e);
			return 5;
		}
	}
	
}
var codeGen = new CodeGen();
console.warn = options.quiet   ? function() {} : console.warn;
console.info = options.verbose ? console.warn : function() {};
process.exitCode = codeGen.exec();

//console.log([2]);
//console.log(CojsonGenerator.fromText('{"a":333}', Options));