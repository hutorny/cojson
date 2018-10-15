/*
 * Copyright (C) 2018 Eugene Hutorny <eugene@hutorny.in.ua>
 *
 * tools.js - COJSON Code Generation Facilities
 *
 * This file is part of COJSON Library. http://hutorny.in.ua/projects/cojson
 *
 * The COJSON Library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License v2
 * as published by the Free Software Foundation;
 *
 * The COJSON Library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License v2
 * along with the COJSON Library; if not, see
 * <http://www.gnu.org/licenses/gpl-2.0.html>.
 */

/*jshint esversion: 6, expr: true , curly: false  */
class CojsonGenerator {
	constructor(options) {
		this.options = Object.assign({}, this.constructor.Options, options);
		this.textstyle = Object.assign({}, this.constructor.TextStyle, this.options.textstyle);		
		this.content = this.constructor.Content;
		this.verbosity = this.options.compact ? 'compact' : 'verbose';		
		this.keywords = this.constructor.Keywords;  // .concat(
													// this.content[this.verbosity].keywords);
		this.reserved = this.constructor.Reserved;
		this.variant = this.options.variant;
		this.head = [];
		this.classes = [];
		this.names = Object.create(null);
		this.state = {};
		this.notes = {};
		this.prefixes = {};
		this.suffixes = {};
		this.input = null;
		this.max_id_len = 32;
		
		this.ident = 0;
		this.validex = /^[_a-zA-Z][_a-zA-Z0-9]{0,30}$/;
		this.invalid = /[^_a-zA-Z0-9]/g;
		this.builtin = /^__builtin_[_a-zA-Z0-9]*$/;
		this.autocount = 0;		
		if( ! this.options.min_strlen ) {
			this.options.min_strlen = 1;
		}
		this.validate_options();
	}
	fromText(text) {
		var input, tail;
		try {
			input = JSON.parse(text);
			this.add(this.content.intro, 
				this.options.write_json  ? this.content.intro_json	+ text + '\n' : undefined,	//{1}
				this.options.build_intro ? this.content.intro_build : undefined, //{2}
				this.options.avr ? undefined : this.content.intro_build_shared, //{2}
				this.options.build_intro &&  this.options.avr ? this.content.intro_build_avr : undefined, //{4} 
				this.options.build_intro && this.options.variant === 'stdlib' && this.options.avr ?
						this.content.intro_build_noavr : undefined //{5} 
				); 
		} catch (e) {
			if( this.options.throw_json_errors ) { throw e; }
			if( this.options.write_json_errors )
				this.add(this.content.message.json_error, e.message);
			return;
		}
		if( this.options.variant === 'stdlib' ) {
			this.add(this.content.include_string);
			this.add(this.content.include_vector);			
		}		
		this.add(this.content.include_cojson);
		if( (this.options.variant === 'stdlib' || this.options.example) && ! this.options.avr )
			this.add(this.content.include_stdlib);			
		if( this.options.example && ! this.options.avr )
			this.add(this.content.include_example);
		if( this.options.namespace )
			tail = this.add(this.content.namespace,this.options.namespace, '', ''); 
		this.fromValue(input, this.topname(input));
		this.close(tail);
		if( this.options.example ) {
			var example = this.constructor.Template[this.options.avr ? 'avrexample' : 'example'];
			this.add(this.content[this.verbosity].line);
			example = this.state.objects || this.state.list || 
				['variables','functions','stdvar'].includes(this.variant) 
				? example.value : example.object		
			this.add(example, 
				this.options.namespace, // {1}
				this.state.cppname,		// {2}
				this.state.classname, 	// {3}
				this.options.test ? this.content.test : '' // 4
			);
		}
	}
	topname(input) {
		switch( typeof input ) {
		case typeof {}: 
			if( Array.isArray(input) ) return 'data';
			var name = (this.options.classname || 'object').toLowerCase();
			return ( name === this.options.classname ) ? "_" + name : name;
		case typeof true:
		case typeof "  ":
		case typeof 1234:
			return 'data';
		default:			
			throw new Error(this.is_not_supported(typeof input)); 
		}		  
	}
	fromValue(input, name) {
		this.state = this.new_state(name);
		var isplainval;
		if( this.fill(this.state, input) )  
			this.parse(input, this.state.childs, this.state);
		else 
			isplainval = ! this.state.objects;
		
		if( this.prefix ) this.prefixes[this.variant] = this.prefix;
		if( this.suffix ) this.suffixes[this.variant] = this.suffix;
		if( this.struct && (isplainval || this.state.plain || this.state.empty ) ) {			
			this.variant = this.content.downgrade[this.variant];
			this.methods_downgraded = this.variant === 'functions' && this.options.variant === 'methods';  
			//this.names.data = 'data';
			this.struct = false;
			if( this.variant !== 'stdvar' )
				console.info("INFO: downgrading to --variant=" + this.variant);
		}
		this.declare_names();
		this.declare(this.state, this.content.decl[this.variant==='methods'?'members':this.variant]);
		this.add(this.content[this.verbosity].line);		
		this.json(this.state, this.content[this.verbosity], 'root');
		this.iterate(this.classes, (v)=> ! v.empty && this.json(v, this.content[this.verbosity], 'top'));
		if( this.variant === 'functions' && this.options.example ) {
			this.add(this.content[this.verbosity].line);		
			this.declare(this.state, this.content.impl.decl);
			this.functions(this.state, this.content.impl.functions);
		}
		if( this.variant === 'methods' ) {
			var template = this.content.impl[this.state.list ? 'functions' : 'methods'];			
			this.methods(this.state, template);
			this.iterate(this.classes, (v)=> {				
				this.methods(v, this.content.impl.methods);			
			});			
		} else { 
			this.add(this.content[this.verbosity].line);
			if( this.options.variant === 'methods' ) {
				this.iterate(this.classes, (v)=> this.methods(v, this.content.impl.methods));					
			}
		}
		
	}
	emtail(s) {
		return s && (s[s.length-1] !== ' ') ? (s + ' ') : s;
	}
	emhead(s) {
		return  s && (s[0] !== ' ') ? (s = ' ' + s) : s;
	}
	validate_options() {
		this.prefix = this.emtail(this.options.prefix);
		this.suffix = this.emhead(this.options.suffix);
		Object.keys(this.options.prefixes).forEach((v)=>this.prefixes[v] = this.emtail(this.options.prefixes[v]));
		Object.keys(this.options.suffixes).forEach((v)=>this.suffixes[v] = this.emtail(this.options.suffixes[v]));
		if( ! this.options.name ) this.options.name = 'name';
		if( this.options.test ) this.options.example = true;
		var i = this.constructor.Variants.indexOf(this.variant);
		if( i >= 0 ) {
			this.struct = i > 1;
			return;
		}
		this.add(this.constructor.Content.message.invalid_variant, this.variant);
		throw new Error("Invalid variant: '" + this.variant + "'");
	}
	add() {
		if( arguments[0] === null || typeof arguments[0] === typeof  undefined) {
			return;
		}
	    var tail = arguments[0].split(/{\|}/);
	    var head = tail[0];
	    tail = tail[1];
	    for (var i = -arguments.length; i < arguments.length; i++) {
	        var regexp = new RegExp('\\{'+i+'\\}', 'gi');
	        var j = i < 0 ? arguments.length + i : i;
	        head = head.replace(regexp, arguments[j] || '');
	        head = head.replace(/\t/gi,this.textstyle.ident);
	        tail && (tail = tail.replace(regexp, arguments[j] || ''));
	    }
	    head = head.split('\n');
	    head.forEach((i)=>this.head.push(this.line(i)));	    
	    if( tail ) {
	    	tail = tail.replace(/\t/gi,this.textstyle.ident);
	    	tail = tail.replace(/\n/gi,'\n' + this.textstyle.ident.repeat(this.ident));
	    	this.ident++;
	    }
	    return tail;	    
	}
	merge(state1, state2) {
		if( !state1 || !state2 ) return state1 || state2;
		if( state1.type !== state2.type ) {
			var types = this.reducetypes([state1.type, state2.type]);
			if( types.length > 1 ) {
				console.warn("WARN: type collision '" + state1.jsonname + "' is '" + state1.type +  "'and '" + state2.jsonname + "' is '" + state2.type +  "'");
				this.add(this.content.message.type_collision, state1.jsonname, state1.type, state2.jsonname, state2.type);
			}
			state2.type = types[0];
		}
		if( state1.item !== state2.item ) {
			var types = this.reducetypes([state1.item, state2.item]);
			if( types.length > 1 ) {
				console.warn("WARN: type collision '" + state1.jsonname + "' is '" + state1.item +  "'and '" + state2.jsonname + "' is '" + state2.item +  "'");
				this.add(this.content.message.type_collision, state1.jsonname, state1.item, state2.jsonname, state2.item);
			}
			state2.item = types[0];
		}
		if( state1.size || state2.size ) state2.size = this.intmax(state2.size, state1.size); 
		if( state1.len || state2.len ) state2.len = this.intmax(state2.len, state1.len); 
		return state2;
	}
	
	parse(input, childs, parent) {
		if( input === null || typeof input === typeof undefined ) {
			this.is_not_supported(input, parent && parent.jsonname );
			parent.invalid = true;
			return;
		}
		if( Array.isArray(input) ) {
			parent.empty = input.length === 0;
			if( parent.empty ) parent.type = '[]';
			input.forEach((v,i)=>{
				var state;
				if( parent.objects && this.struct ) {
					if( i === 0 )
						state = this.new_state(parent.name, parent);
					else
						state = childs[i = 0];
				} else {
					state = this.new_state(parent.name + '_' + i, parent);
				}
				if( this.fill(state, v, parent) ) {
					this.parse(v, state.childs, state);
				}
				childs[i] = this.merge(state,childs[i]);
			});
		} else {
			parent.empty = Object.keys(input).length === 0;
			if( parent.empty ) parent.type = '{}';
			Object.keys(input).forEach((key)=>{
				var state = this.new_state(key, parent);			
				if( this.fill(state, input[key], parent) ) {
					this.parse(input[key], state.childs, state);
				}
				childs[key] = this.merge(state, childs[key]);
			});
		}			
	}
	new_state(key, parent) {		
		var id = this.sanitize(key);
		var name = id;
		var jsonname = parent && parent.jsonname ? [parent.jsonname,key].join('.') : parent ? key : '';
		if( this.names[id] && ! this.struct ) {
			name = '"' + id + '"';
			if( key !== id ) name += ' ("' + id + '")'; 
			this.add(this.notes.name_collision ? 
				this.content.message.name_collision : this.content.message.name_collision_new, name);
			console.warn('WARN: Name collision for ' + name);
			if( ! this.notes.name_collision && ! ['members','methods'].includes(this.options.variant) ) {
				console.info('INFO: Use --members or --methods instead of --variables or --functions');
				this.notes.name_collision = true;
			}
			name = id + '_' + (++this.autocount);
		}
		if( parent && ! parent.list && ! parent.type != 'vector' &&  parent.type != 'objects' )
			this.names[id] = key;
		var cppname = !parent || ! parent.objects ? name : '';
		while( cppname && this.nameinuse(cppname,parent) ) cppname = this.autogen(name);
		if( parent && parent.names ) parent.names.push(cppname);
		return { 
			name : id, 
			src: key, 
			cppname : cppname, 
			parentclass : parent ? parent.classname : this.options.classname,
			jsonname : jsonname,
			root : ! parent 
		};					
	}
	reducetypes(types) {
		if( types.includes('float') )
			types = types.filter((t)=>!['int','uint'].includes(t));
		if( types.includes('int') )
			types = types.filter((t)=>!['uint'].includes(t));
		return types;
	}	
	reduce(types) {
		var keys = Object.keys(types);
		if( keys.length < 2  ) return keys; 
		/* upgrading array item types uint -> int -> float */
		return this.reducetypes(keys);
	}
	
	strlen(str) {
		return Math.max(str.length + this.options.strings_with_traling_0, this.options.min_strlen);
	}
	
	isvector(input, state) {
		const nonvectorizable = this.struct ? ['list', 'vector'] : ['list', 'vector', 'object'];			
		const nonmixeable     = ['bool', 'vector', 'list', 'string', 'strings', 'object'];
		var types = {};
		//state && (state.size = input.length );
		state.size = Math.max(input.length, state.size | 0 );
		switch( input.length ) {
		case 0:			
			return 'list';
		case 1:
			state.item = this.typify(input[0], state);
			if( nonvectorizable.includes(state.item) ) return 'list';
			switch( state.item ) {
			case 'string':
				state.len = this.intmax(this.strlen(input[0]), state.len);
				return 'strings';
			case 'object':
				return 'objects';
			}
			return 'vector';			    
		default:
			input.forEach((i)=>types[this.typify(i, state)]=true);
			types = this.reduce(types);
			switch(types.length) {
			case 0: return false;
			case 1: 
				state.item = types[0];
				if( nonvectorizable.includes(state.item) )
					return 'list';				
				if( state.item === 'string' ) {
					var len = 0;
					input.forEach((i)=>len<i.length && (len = this.strlen(i)));
					state.len = this.intmax(len, state.len);
					return 'strings';
				}
				return state.item === 'object' ? 'objects' : 'vector';
			default:
				state.plain = ! types.includes('object');
				if( types.some((i)=>nonmixeable.includes(i)) ) {					
					return 'list';				
				}
				state.item = types[0];
				return 'vector';
			}
		}
	}	
	typify(input, state) {
		if( input === null) {
			this.add(this.content.message.null_replaced, state.jsonname);
			return 'string';
		}
		switch(typeof input) {
		case typeof true:
			return 'bool';
		case typeof 1234:
			return ( input !== (input|0) ) ? // jshint ignore:line
				'float' : input < 0 ? 'int' : 'uint';
		case typeof "  ":
			return 'string';
		case typeof {  }:
			if( Array.isArray(input) ) {				
				return this.isvector(input, state); 				
			} else {
				return 'object';
			}
		}
	}
	is_not_supported(input, name) {
		if( name ) {
			this.add(this.content.message.not_supported2, name, JSON.stringify(input));
		} else {
			this.add(this.content.message.not_supported, JSON.stringify(input)); 
		}
		console.warn('WARN: Unsupported data type: ' , input);
		return this.content.message.not_supported;
	}
	isembedded(type) {
		const collections = [/* 'list', */ 'strings', 'vector', 'objects'];
		return collections.includes(type);
	}	
	classname(state, parent) {
		const scalars = ['bool', 'float', 'uint', 'int', 'string' /* , 'list' */];

		if( ! this.struct ) return '';
		
		var scalar = scalars.includes(state.type);
		
		if( ! parent ) {			
			return state.type === 'list' ? '' : 
				scalar ? this.typename(state.cppname) : this.options.classname;
		}
		if( state.type === 'vector' && parent.list )
			return parent.classname;
		
		var embedded = this.isembedded(parent.type);  		
		return (scalar || embedded || state.type === 'list' ) ? 
				  parent.classname 
				: this.typename(state.cppname, parent);
	}
	fullclass(state, parent) {		
		if( ! parent ) 
			return state.classname;		
		if( (parent.objects && parent.root) || state.type !== 'object' ) {
			return parent.fullclass || parent.classname; 
		}
		return parent.fullclass ? 
			  [parent.fullclass, state.classname].join('::')
			: state.classname;
	}
	intmax(a, b) {
		return Math.max(a|0, b|0); 
	}
	fill(state, input, parent) {
		state.type = this.typify(input, state);
							
		state.classname = this.classname(state, parent);
		state.fullclass = this.fullclass(state, parent);
		
		if(parent && this.isembedded(parent.type) ) {
			state.name = parent.name;
		}
		state.fullname  = parent && parent.fullclass ? [parent.fullclass, state.name].join('::') : state.name;

		if( parent && parent.list )
			state.name = parent.name; 
		
		switch( state.type ) {
		case 'string':
			if( input === null ) input = '';
			state.size = this.intmax(this.strlen(input), state.size);
			return false;
		case 'strings':
			return false;			
		case 'object':
			if(! state.childs )
				state.childs = Object.create(null);
			state.struct = true;
			return true;
		case 'objects':
			state.objects = true;
			state.size = Math.max(input.length, state.size|0);
			if(! state.childs )
				state.childs = [];
			return true;
		case 'vector':
			state.size = Math.max(input.length, state.size|0);
			if(! state.childs )
				state.childs = [];
			return false;
		case 'list':
			state.list = true;
			if(! state.childs )
				state.childs = [];
			if(! state.names )
				state.names = (parent && parent.names) || [];			
			return true;
		default:
			return false;				
		}		
	}
	addstate(templ, v, dlm, sep) {
		return this.add(templ, 			
			this.options.name, 								// {1}
			this.content.type[v.type],						// {2}
			v.name,											// {3}
			v.size,											// {4}
			this.content.type[v.item] || v.item,			// {5}
			v.len,											// {6}
			v.cppname,										// {7}
			v.classname,									// {8}
			v.fullname,										// {9}
			v.fullclass,									// {10}
			v.parentclass,									// {11}
			this.prefixes.methods,							// {-10}
			this.suffixes.methods,							// {-9}
			this.prefixes.members,							// {-8}
			this.suffixes.members,							// {-7}
			this.prefixes.functions,						// {-6}
			this.suffixes.functions,						// {-5}
			this.prefixes.variables,						// {-4}
			this.suffixes.variables,						// {-3}
			sep,											// {-2}
			dlm);											// {-1}
	}
	json(state, template, root) {
		var tails = [];
		var impl = template[this.upgrade(root === 'top' )];
		if( root && state.root && state.list && this.struct )
			impl = this.options.variant === 'stdlib' ? template.stdlist : template.list;
		if( root ) {
			var jsonf = state.root && state.objects ? template.variables.json : impl.json;
			tails.unshift(this.addstate(jsonf, state, '', (state.empty ? '' : ',')));
			this.add(template.using_cojson);
			tails.unshift(this.add(template.return_));
			tails.unshift(this.addstate((impl.top && impl.top[state.type]) || impl.value[state.type], state, '', (state.empty ? '' : ',')));
		} 
		var inst = (state.type === 'object') ? impl.member : impl.value;
		if( ! state.objects  )
			this.iterate(state.childs, (v, i, a, last) => {
				if( v.invalid ) return;
				var t = v.type === 'object' && (! v.classname && 'plain') || v.type;
				//if( this.options.compact && v.type === 'list' && v.empty ) t = '[]';
				t = this.addstate(inst[t], v, last ? '' : ',', (v.empty ? '' : ','));
				if( !(this.struct && this.classes.includes(v)) )
					this.json(v, template);
				this.close(t);
			});
		this.close(tails);
	}
	upgrade(top) {
		const map = { variables: 'members', functions: 'methods', stdvar: 'stdlib' };
		return (top && map[this.variant]) || this.variant;  
	}
	
	derivatives(cppname) {
		return [cppname + '_get', cppname + '_set', cppname + '_ptr', cppname + '_array'];		
	}
	nameinuse(cppname, parent) {
		var inuse = parent && (parent.classname === cppname || parent.names && parent.names.includes(cppname));		
		if( inuse || ! (parent && parent.childs) ) {
			return inuse;
		}
		this.iterate(parent.childs, (v)=>inuse = inuse || 
				v.classname === cppname || 
				v.cppname === cppname ||
				(parent.list && this.nameinuse(cppname, v)) ||
				(this.options.example && this.options.variant === 'functions' && 
				 this.derivatives(v.cppname).includes(cppname)) );
		return inuse;
	}	
	typename(name, parent) {
		var type, alias = name.replace(/^[_0-9]*\w/,(c)=>c.toUpperCase());
		type = name === alias ? this.autogen(alias) : alias;
		if( ! parent ) return type;
		// handling possible type conflicts
		while( type === parent.classname || this.nameinuse(type, parent) ) type = this.autogen(alias);
		return type;
	}
	declare_names() {
		if( Object.keys(this.names).length === 0 ) return;
		var tail = this.add(this.content.namespace, this.options.name, 
				   this.options.avr ? this.content[this.verbosity].avrdefine : undefined, 
				   this.options.avr ? this.content[this.verbosity].avrundef : undefined);
			Object.keys(this.names).forEach((key)=>{
				if( this.names[key].length > this.max_id_len ) {
					console.warn('WARN: Name "' + this.names[key] + '" exceeds default maximal identifier length of ' + this.max_id_len);
					if( ! this.warn_name_too_long ) {
						this.warn_name_too_long = true;						
						console.info('INFO: Adjust configuration value max_key_length');
					}
				}					
				this.close(this.add(this.options.avr ? this.content[this.verbosity].progmem : this.content.decl.name, 
					key, this.escape(this.names[key]),
					(this.names[key].length > this.max_id_len ? this.content.message.name_too_long : '')
				));
			});		
		this.close(tail);
	}
			
	declare(state, template, parent) {
		var tails = [];
		if( this.methods_downgraded && state.objects ) {
			if( template === this.content.impl.decl ) return;			
			if( template === this.content.decl.functions ) {
				template = this.content.decl.members;
			}
		}
		if( state.type ) {
			if(! state.objects && ! state.empty && (state.type !== 'object' || state.classname) )
				tails.unshift(this.addstate(template[state.type], state));
			! state.root && state.type === 'object' &&
			( (this.struct && ! state.plain && ! state.objects) || (parent && parent.objects ) ) &&
			!this.classes.includes(state) && this.classes.push(state);
		}
		if( state.childs ) {
			this.iterate(state.childs, (v)=>this.declare(v, template, state));
			if( this.variant === 'methods' || (parent && parent.objects && this.options.variant === 'methods') ) {
				var decl = this.content.decl[state.root && state.list ? 'forwards' : 'methods'];
				this.iterate(state.childs, (v, i, a, l)=>{
					if( ! v.objects )
						this.close(this.addstate(decl[v.type], v, l ? ';':','));
				});
			}
		}
		if( state.objects )
			tails.unshift(this.addstate(template[state.type], state));
		this.close(tails);
	}
	functions(state, template, parent) {
		var tails = [];
		if( this.methods_downgraded && state.objects ) {
			return;
		}
		if( state.type ) {
			if(! state.objects && ! state.empty && (state.type !== 'object' || state.classname) )
				tails.unshift(this.addstate(template[state.type], state));
		}
		if( state.childs ) {
			this.iterate(state.childs, (v)=>this.functions(v, template, state));
			if( this.variant === 'methods' || (parent && parent.objects && this.options.variant === 'methods') ) {
				var decl = this.content.decl[state.root && state.list ? 'forwards' : 'methods'];
				this.iterate(state.childs, (v, i, a, l)=>{
					if( ! v.objects )
						this.close(this.addstate(decl[v.type], v, l ? ';':','));
				});
			}
		}
		if( state.objects )
			tails.unshift(this.addstate(template[state.type], state));
		this.close(tails);
	}
	methods(state, template) {
		if( state.type ) {
			if(! state.objects )
				this.close(this.addstate(template[state.type], state, state.childs ? '\n':''));
		}
		if( state.childs ) {
			this.iterate(state.childs,(v, i, a, l)=>{
				this.close(this.addstate(template[v.type], v, l ? '\n':''));
				if( v.list ) this.methods(v, template);
			});
		}
	}
	sanitize(name) {
		if( name === "" ) return this.autogen();
		if( name.match(this.validex) ) {
			if ( this.keywords.includes(name) || name.match(this.builtin) )
				name = name.replace(/^[_0-9]*\w/,(c)=>(/[a-z]/.test(c) ? c.toUpperCase() : c));
			if( this.keywords.includes(name) )
				name = name.replace(/^\w/,(c)=>(c==='_'? 'v': 'v'+c));				
		}
		var valid = name.replace(this.invalid, '_');
		if( ! valid.charAt(0).match(/[_a-zA-Z]/) ) valid = '_' + valid;
		if( ! valid.match(this.validex) ) valid = this.autogen();
		if( this.names[valid] && this.names[valid] !== name ) {
			valid = this.surrogate(name, valid);
		}
		return valid; 
	}
	iterate(src, func) { /* function(element, key/index, src, last) */
		if( !src ) return;
		if( Array.isArray(src) )
			src.forEach((v,i,a)=>func(v,i,a,i===a.length-1));
		else 
			Object.keys(src).forEach((v,i,a)=>func(src[v], v, src, i===a.length-1));
	}
	surrogate(name, valid) {
		for(var i = 0; i<10; ++i) {
			var subst = valid + '_' + i;
			if( ! this.names[subst] || this.names[subst] !== name )
				return subst;
		}
		return this.autogen();
	}
	escape(name) {
		return JSON.stringify(name).slice(1,-1);
	}
	autogen(name) {
		return (name && name.split('_')[0] || 'name') +'_'+ (++this.autocount);
	}
	output() {
		if( ! this.head.length ) return null;
		return this.head.join(this.textstyle.eol);
	}
	line(l) {
		return this.textstyle.ident.repeat(this.ident) + l;
	}
	close(tail) {
		if( typeof tail === typeof [] ) {
			for(var i in tail) if(tail[i]) this.close(tail[i]);			
		} else if( typeof tail === typeof '' ) {
			this.head[this.head.length-1] = this.head[this.head.length-1] + tail; 
		    this.ident--;		
		}
	    if( this.ident < 0 ) {
	    	if( this.failed_ident )
	    		console.info("INFO: failed to make proper indentation");
	    	this.failed_ident = true;
	    	this.ident = 0;
	    }		
	}
}

CojsonGenerator.TextStyle = {
	eol   : '\n',
	ident : '    '
};

/* \n{1}\n{2}\n{3}\n{4}\n{5}\n{6}\n{7}\n{8}\n{9}\n */

/* commonly used content templates */
CojsonGenerator.Template = {
	decl : {
		variables: '{-4}{2} {7}{-3};',
		functions: '{-6}{2} {7}_get() noexcept{-5};\n{-6}void {7}_set({2}) noexcept{-5};',
		members  : '{-8}{2} {7}{-7};',
		methods  :'{-10}{2} {7}_get() const noexcept{-9};\n{-10}void {7}_set({2}) noexcept{-9};',
		string 	 : '{-4}{2} {7}[{4}]{-3};',
		strings	 : '{-4}{5} {7}[{4}][{6}]{-3};',
		vector	 : '{-4}{5} {7}[{4}]{-3};',
		object	: `
struct {8} {{|}
public:	
	static const cojson::details::clas<{8}>& json() noexcept;
    inline bool json(cojson::details::lexer& in) noexcept {
    	return json().read(*this, in);
    }
    inline bool json(cojson::details::ostream& out) const noexcept {
    	return json().write(*this, out);
    }	
} {7}{-7};`
	},
	impl : {
		functions: `
{2} {7}_get() noexcept {
	return {7};
}
void {7}_set({2} _{7}) noexcept {
	{7} = _{7};
}`,
	methods: `
{2} {10}::{7}_get() const noexcept {
	return {7};
}
void {10}::{7}_set({2} _{7}) noexcept {
	{7} = _{7};
}`  
	},
	verbose : {
		value:		'ValuePointer<decltype({7}), &{7}>{-1}',
		member:		'MemberPointer<{1}::{3}, decltype({7}), &{7}>{-1}',
		functions:	'ValueGetterSetter<std::result_of<decltype({7}_get)&()>::type, &{7}_get, &{7}_set>{-1}',
		getters:	'MemberValue<{1}::{3}, ValueGetterSetter<std::result_of<decltype({7}_get)&()>::type, &{7}_get, &{7}_set>>{-1}',
		property:	'PropertyScalarMember<{8}, {1}::{3}, decltype({8}::{7}), &{8}::{7}>{-1}',
		methods:	'PropertyScalarAccessor<{8}, {1}::{3}, accessor::methods<\n\t{8}, decltype({8}::{7}), &{8}::{7}_get, &{8}::{7}_set>>{-1}'
	},		
	compact : {
		value:		'V<{2}, &{7}>{-1}',
		member:		'M<{1}::{3}, {2}, &{7}>{-1}',
		functions:	'V<{2}, &{7}_get, &{7}_set>{-1}',
		getters:	'M<{1}::{3}, V<{2}, &{7}_get, &{7}_set>>{-1}',
		property:	'P<{8}, {1}::{3}, {2}, &{8}::{7}>{-1}',
		methods:	'P<{8}, {1}::{3}, methods<\n\t{8}, {2}, &{8}::{7}_get, &{8}::{7}_set>>{-1}'
	},
	example : {
		value : `
int main(int, char**) {
	cojson::wrapper::istream<std::istream> input(std::cin);
	cojson::wrapper::ostream<std::ostream> output(std::cout);
	{1}::json().read(input);
	{1}::json().write(output);
	{4}
	return 0;
}`,
		object : `
int main(int, char**) {
	cojson::wrapper::istream<std::istream> input(std::cin);
	cojson::wrapper::ostream<std::ostream> output(std::cout);
	{1}::{2}.json(input);
	{1}::{2}.json(output);
	{4}
	return 0;
}`},
	avrexample : {
	value : `int main() {
	static volatile char buffer[256];
	cojson::wrappers::memstream stream(buffer);
	cojson::lexer input(stream);
	{1}::json().read(input);
	{1}::json().write(stream);
	{4}
	return 0;
}`,
	object : `int main() {
	static volatile char buffer[256];
	cojson::wrappers::memstream stream(buffer);
	cojson::lexer input(stream);
	{1}::{2}.json(input);
	{1}::{2}.json(stream);
	{4}
	return 0;
}`}
};

CojsonGenerator.Variants = ['variables','functions','members','methods', 'stdlib'];

CojsonGenerator.Content = {
	intro : `/*
 * This file is generated with COJSON Code Generator
 * You can redistribute it and/or modify it under the terms of the 
 * GNU General Public License v2
 * 
{1}{2}{3}{4}{5}
 */`,
	intro_json : ` * Using the following input JSON\n`,
	intro_build: ` * Build your application with this file and the following sources: 
 *     cojson/src/cojson.cpp 
 *     cojson/src/cojson_libdep.cpp`,
 	intro_build_shared: `
 *     cojson/src/platforms/shared/chartypetable.cpp`,
 	intro_build_avr: `
 *     cojson/src/platforms/avr/*.cpp
 *         
 * ¹ Note: for AVR follow build instructions given in 
 *     http://hutorny.in.ua/projects/cojson/cojson-tutorial#build`,		
 	intro_build_noavr: `
 *         
 * ² Note: GCC AVR has no support for C++ stdlib`,		
	include_cojson : '#include <cojson.hpp>',
	include_vector : '#include <vector>',
	include_string : '#include <string>',
	include_stdlib : '#include <cojson_stdlib.hpp>',
	include_example : '#include <iostream>',
	namespace : 'namespace {1} {{2}{|}{3}\n}',
	struct : 'struct {1} {\n{|}}',
	debug : '/*\n 0:{-1}\n 1:{1}\n 2:{2}\n 3:{3}\n 4:{4}\n 5:{5}\n 6:{6}\n 7:{7}\n 8:{8}\n 9:{9}\n10:{10}\n11:{11}\n */',
	type : { 
		bool	: 'bool', 
		float	: 'double', 
		int		: 'int', 
		uint	: 'unsigned',
		string	: 'char',
		vector	: 'vector',
		strings : 'char',
		list	: 'list',
		object	: 'object',
		objects	: 'object[]'
	},	
	downgrade : {
		variables : 'variables',
		functions : 'functions',
		members   : 'variables',
		methods   : 'functions',
		stdlib    : 'stdvar'
	},
	decl : {		
		variables : {			
			bool	: CojsonGenerator.Template.decl.variables,
			float	: CojsonGenerator.Template.decl.variables,
			uint	: CojsonGenerator.Template.decl.variables,
			int		: CojsonGenerator.Template.decl.variables,
			string 	: CojsonGenerator.Template.decl.string,
			strings	: CojsonGenerator.Template.decl.strings,
			vector	: CojsonGenerator.Template.decl.vector,
			list	: '/* flatenned list "{3}"             */',
			object	: CojsonGenerator.Template.decl.object,
			objects	: '{-8}{8} {7}[{4}]{-7};'
		},
		functions : {
			bool	: CojsonGenerator.Template.decl.functions,
			float	: CojsonGenerator.Template.decl.functions,
			uint	: CojsonGenerator.Template.decl.functions,
			int		: CojsonGenerator.Template.decl.functions,
			string 	: CojsonGenerator.Template.decl.string,
			strings	: CojsonGenerator.Template.decl.strings,
			vector	: '{-6}{5}* {7}_array(cojson::size_t) noexcept{-7};',
			list	: '/* flatenned list "{3}"             */',
			object	: CojsonGenerator.Template.decl.object,
			objects	: '{-8}{8} {7}[{4}]{-7};'
		},
		members : {
			bool	: CojsonGenerator.Template.decl.members,
			float	: CojsonGenerator.Template.decl.members,
			uint	: CojsonGenerator.Template.decl.members,
			int		: CojsonGenerator.Template.decl.members,
			string 	: '{-8}{2} {7}[{4}]{-7};',
			strings	: '{-8}{5} {7}[{4}][{6}]{-7};',
			vector	: '{-8}{5} {7}[{4}]{-7};',
			list	: '/* items of a heterogeneous list "{3}": */',
			object	: CojsonGenerator.Template.decl.object,
			objects	: '{-8}{8} {7}[{4}]{-7};'
		},
		forwards : {
			bool	: CojsonGenerator.Template.decl.functions,
			float	: CojsonGenerator.Template.decl.functions,
			uint	: CojsonGenerator.Template.decl.functions,
			int		: CojsonGenerator.Template.decl.functions
		},
		methods : {
			bool	: CojsonGenerator.Template.decl.methods,
			float	: CojsonGenerator.Template.decl.methods,
			uint	: CojsonGenerator.Template.decl.methods,
			int		: CojsonGenerator.Template.decl.methods,
			objects	: '{-8}{8} {7}[{4}]{-7};'
		},		
		stdlib : {
			bool	: CojsonGenerator.Template.decl.members,
			float	: CojsonGenerator.Template.decl.members,
			uint	: CojsonGenerator.Template.decl.members,
			int		: CojsonGenerator.Template.decl.members,
			string 	: '{-8}std::string {7}{-7};',
			strings	: '{-8}std::vector<std::string> {7}{-7};',
			vector	: '{-8}std::vector<{5}> {7}{-7};',
			list	: '/* items of a heterogeneous list "{3}": */',
			object	: CojsonGenerator.Template.decl.object,
			objects	: '{-8}std::vector<{8}> {7}{-7};'
		},
		stdvar : {			
			bool	: CojsonGenerator.Template.decl.variables,
			float	: CojsonGenerator.Template.decl.variables,
			uint	: CojsonGenerator.Template.decl.variables,
			int		: CojsonGenerator.Template.decl.variables,
			string 	: '{-4}std::string {7}{-3};',
			strings	: '{-4}std::vector<std::string> {7}{-3};',
			vector	: '{-4}std::vector<{5}> {7}{-3};',
			list	: '/* flatenned list "{3}"             */',
			object	: CojsonGenerator.Template.decl.object,
			objects	: '{-8}std::vector<{8}> {7}{-7};'
		},
		name    : 'inline constexpr const char* {1}() noexcept { return "{2}"; {3}}',
	},
	impl : {		
		decl : {			
			bool	: CojsonGenerator.Template.decl.variables,
			float	: CojsonGenerator.Template.decl.variables,
			uint	: CojsonGenerator.Template.decl.variables,
			int		: CojsonGenerator.Template.decl.variables,
			vector	: CojsonGenerator.Template.decl.vector
		},
		functions : {
			bool	: CojsonGenerator.Template.impl.functions,
			float	: CojsonGenerator.Template.impl.functions,
			uint	: CojsonGenerator.Template.impl.functions,
			int		: CojsonGenerator.Template.impl.functions,
			vector	: `{5}* {7}_array(cojson::size_t {7}_index) noexcept {
	return {7}_index < std::extent<decltype({7})>::value ?
		{7}+{7}_index : nullptr;
}`,
		},
		methods : {
			bool	: CojsonGenerator.Template.impl.methods,
			float	: CojsonGenerator.Template.impl.methods,
			uint	: CojsonGenerator.Template.impl.methods,
			int		: CojsonGenerator.Template.impl.methods
		}
	},
	compact : {
		using_cojson: 'using namespace cojson;\nusing namespace cojson::accessor;\n',
		return_	: 'return {|}();',
		progmem : 'CSTRING_NAME({1},"{2}") {3}',
		avrdefine : `\r#define CSTRING_NAME(a,b) inline cojson::cstring a() noexcept {\\
			static const char l[] __attribute__((progmem))= b;\\
			return cojson::cstring(l);\\\n\t\t}`,
		avrundef : '\r#undef CSTRING_NAME',
		variables : {
			json : '\nconst cojson::details::value& json() noexcept {{|}\n}',
			top	: {
				list:   'V<{|}\n>',
				object: 'V<{|}\n>',
				"{}":   'details::ValueObject<>',
				"[]":   'V<>'
			},
			value : {
				bool	: CojsonGenerator.Template.compact.value,
				float	: CojsonGenerator.Template.compact.value,
				uint	: CojsonGenerator.Template.compact.value,
				int		: CojsonGenerator.Template.compact.value,
				string	: 'V<{4}, {7}>{-1}',
				strings	: 'V<{4}, {6}, {7}>{-1}',
				vector	: 'V<{5}, {4}, {7}>{-1}',
				object  : 'V<pointer<{8}, &{7}>, &{8}::json>{-1}', 
				objects : 'V<array<{8}, {4}, {7}>, &{8}::json>{-1}', 
				plain	: 'V<{|}\n>{-1}',
				list	: 'V<{|}\n>{-1}',		
				"{}"	: 'details::ValueObject<>{-1}',
				"[]"	: 'V<>{-1}'		
			},
			member : {
				bool	: CojsonGenerator.Template.compact.member,
				float	: CojsonGenerator.Template.compact.member,
				uint	: CojsonGenerator.Template.compact.member,
				int		: CojsonGenerator.Template.compact.member,
				string	: 'M<{1}::{3}, V<{4}, {7}>>{-1}',
				strings	: 'M<{1}::{3}, V<{4}, {6}, {7}>>{-1}',
				vector	: 'M<{1}::{3}, V<{5}, {4}, {7}>>{-1}',
				object	: 'M<{1}::{3}, V<pointer<{5}, &{7}>, &{8}::json>>{-1}',
				objects	: 'M<{1}::{3}, V<array<{8},{4}, {7}>, &{8}::json>{-1}', 
				plain	: 'M<{1}::{3}, V<{|}>\n>{-1}',
				list	: 'M<{1}::{3}, V<{|}\n>>{-1}',
				"{}"	: 'M<{1}::{3}, details::ValueObject<>\n>{-1}',
				"[]"	: 'M<{1}::{3}, V<>>{-1}'		
			}
		},
		list : {
			json : '\nconst cojson::details::value& json() noexcept {{|}\n}',
			top	: {
				list:   'V<{|}\n>',
				object: 'V<{|}\n>',
				"{}":   'details::ValueObject<>',
				"[]":   'V<>'
			},
			value : {
				bool	: CojsonGenerator.Template.compact.value,
				float	: CojsonGenerator.Template.compact.value,
				uint	: CojsonGenerator.Template.compact.value,
				int		: CojsonGenerator.Template.compact.value,
				string	: 'V<{4}, {7}>{-1}',
				object  : 'V<pointer<{8}, &{7}>, &{8}::json>{-1}', 
				objects : 'V<array<{8}, {4}, {7}>, &{8}::json>{-1}', 
				list	: 'V<{|}\n>{-1}',		
				"{}"	: 'details::ValueObject<>{-1}',
				"[]"	: 'V<>{-1}'				
			},
			member : {
				bool	: CojsonGenerator.Template.compact.member,
				float	: CojsonGenerator.Template.compact.member,
				uint	: CojsonGenerator.Template.compact.member,
				int		: CojsonGenerator.Template.compact.member,
				string	: 'M<{1}::{3}, V<{4}, {7}>>{-1}',
				strings	: 'M<{1}::{3}, V<{4}, {6}, {7}>>{-1}',
				vector	: 'M<{1}::{3}, V<{5}, {4}, {7}>>{-1}',
				object	: 'M<{1}::{3}, V<{|}\n>>{-1}',
				list	: 'M<{1}::{3}, V<{|}\n>>{-1}',
				"{}"	: 'M<{1}::{3}, details::ValueObject<>\n>{-1}',
				"[]"	: 'M<{1}::{3}, V<>>{-1}'
			}
		},
		members : {
			json : '\nconst cojson::details::clas<{10}>& {10}::json() noexcept {{|}\n}',
			top	: {
				object: 'O<{8}{-2}{|}\n>',
				objects: 'V<array<{8}, {4}, {7}>, &{8}::json>', 
				"{}":   'details::ValueObject<>',
				"[]":   'V<>'
			},
			value : {
				bool	: CojsonGenerator.Template.compact.property,
				float	: CojsonGenerator.Template.compact.property,
				uint	: CojsonGenerator.Template.compact.property,
				int		: CojsonGenerator.Template.compact.property,
				string	: 'P<{11}, {1}::{3}, {4}, &{8}::{7}>{-1}', 
				strings	: 'P<{11}, {1}::{3}, {4}, {6}, &{11}::{7}>{-1}',
				vector	: 'P<{11}, {1}::{3}, {5}, {4}, &{8}::{7}>{-1}',
				object	: 'P<{11}, {1}::{3}, {8}, &{11}::{7}, {8}::json>{-1}',
				objects	: 'P<{11}, {1}::{3}, {8}, {4}, &{11}::{7}, {8}::json>{-1}',
				list	: 'P<{8}, {1}::{3}{-2}{|}\n>{-1}',
				"{}"	: 'P<{11}, {1}::{3}, details::ValueObject<>>{-1}',
				"[]"	: 'P<{8}, {1}::{3}{-2}, V<>>{-1}'
			},
			member : {
				bool	: CojsonGenerator.Template.compact.property,
				float	: CojsonGenerator.Template.compact.property,
				uint	: CojsonGenerator.Template.compact.property,
				int		: CojsonGenerator.Template.compact.property,
				string	: 'P<{11}, {1}::{3}, {4}, &{11}::{7}>{-1}', 
				strings	: 'P<{11}, {1}::{3}, {4}, {6}, &{11}::{7}>{-1}',
				vector	: 'P<{11}, {1}::{3}, {5}, {4}, &{11}::{7}>{-1}',
				object	: 'P<{11}, {1}::{3}, {8}, &{11}::{7}, {8}::json>{-1}',
				objects	: 'P<{11}, {1}::{3}, {8}, {4}, &{11}::{7}, {8}::json>{-1}',
				list	: 'P<{8}, {1}::{3}{-2}{|}\n>{-1}',
				"{}"	: 'P<{11}, {1}::{3}, details::ValueObject<>>{-1}',
				"[]"	: 'P<{8}, {1}::{3}{-2}, V<>>{-1}'
			}
		},
		functions : {
			json : '\nconst cojson::details::value& json() noexcept {{|}\n}',
			top	: {
				list:   'V<{|}\n>',
				object: 'V<{|}\n>',
				"{}":   'details::ValueObject<>',
				"[]":   'V<>'
			},
			value : {
				bool	: CojsonGenerator.Template.compact.functions,
				float	: CojsonGenerator.Template.compact.functions,
				uint	: CojsonGenerator.Template.compact.functions,
				int		: CojsonGenerator.Template.compact.functions,
				string	: 'V<{4}, {7}>{-1}',
				strings	: 'V<{4}, {6}, {7}>{-1}',
				vector	: 'V<vector<{5}, &{7}_array>>{-1}',
				object  : 'V<pointer<{8}, &{7}>, &{8}::json>{-1}', 
				objects : 'V<array<{8}, {4},{7}>, &{8}::json>{-1}', 
				plain	: 'V<{|}\n>{-1}',
				list	: 'V<{|}\n>{-1}',
				"{}"	: 'details::ValueObject<>{-1}',
				"[]"	: 'V<>{-1}'					
			},
			member : {
				bool	: CojsonGenerator.Template.compact.getters,
				float	: CojsonGenerator.Template.compact.getters,
				uint	: CojsonGenerator.Template.compact.getters,
				int		: CojsonGenerator.Template.compact.getters,
				string	: 'M<{1}::{3}, V<{4}, {7}>>{-1}',
				strings	: 'M<{1}::{3}, V<{4}, {6}, {7}>>{-1}',
				vector	: 'M<{1}::{3}, V<vector<{5}, &{7}_array>>>{-1}',
				object	: 'M<{1}::{3}, V<pointer<{8}, &{7}>, &{8}::json>>{-1}',
				objects	: 'M<{1}::{3}, V<array<{8}, {4}, {7}>, &{8}::json>{-1}', 
				plain	: 'M<{1}::{3}, V<{|}>\n>{-1}',
				list	: 'M<{1}::{3}, V<{|}\n>>{-1}',
				"{}"	: 'M<{1}::{3}, details::ValueObject<>>{-1}',
				"[]"	: 'M<{1}::{3}, V<>>{-1}'	
			}
		},
		methods : {
			json : '\nconst cojson::details::clas<{10}>& {10}::json() noexcept {{|}\n}',
			top	: {
				object: 'O<{8}{-2}{|}\n>',
				objects: 'V<array<{8}, {4} ,{7}>, &{8}::json>', 
				"{}":   'details::ValueObject<>',
				"[]":   'V<>'
			},
			value : {
				bool	: CojsonGenerator.Template.compact.methods,
				float	: CojsonGenerator.Template.compact.methods,
				uint	: CojsonGenerator.Template.compact.methods,
				int		: CojsonGenerator.Template.compact.methods,
				string	: 'P<{11}, {1}::{3}, {4}, &{8}::{7}>{-1}', 
				strings	: 'P<{11}, {1}::{3}, {4}, {6}, &{11}::{7}>{-1}',
				vector	: 'P<{11}, {1}::{3}, {5}, {4}, &{8}::{7}>{-1}',
				object	: 'P<{11}, {1}::{3}, {8}, &{11}::{7}, {8}::json>{-1}',
				objects	: 'P<{11}, {1}::{3}, {8}, {4}, &{11}::{7}, {8}::json>{-1}',
				list	: 'P<{8}, {1}::{3}{-2}{|}\n>{-1}',
				"{}"	: 'P<{11}, {1}::{3}, details::ValueObject<>>{-1}',
				"[]"	: 'P<{8}, {1}::{3}, V<>>{-1}',
			},
			member : {
				bool	: CojsonGenerator.Template.compact.methods,
				float	: CojsonGenerator.Template.compact.methods,
				uint	: CojsonGenerator.Template.compact.methods,
				int		: CojsonGenerator.Template.compact.methods,
				string	: 'P<{11}, {1}::{3}, {4}, &{11}::{7}>{-1}', 
				strings	: 'P<{11}, {1}::{3}, {4}, {6}, &{11}::{7}>{-1}',
				vector	: 'P<{11}, {1}::{3}, {5}, {4}, &{11}::{7}>{-1}',
				object	: 'P<{11}, {1}::{3}, {8}, &{11}::{7}, {8}::json>{-1}',
				objects	: 'P<{11}, {1}::{3},\ {8}, {4}, &{11}::{7}, {8}::json>{-1}',
				list	: 'P<{11}, {1}::{3}{-2}{|}\n>{-1}',
				"{}"	: 'P<{11}, {1}::{3}, details::ValueObject<>>{-1}',
				"[]"	: 'P<{11}, {1}::{3}, V<>>{-1}'
			}
		},
		stdlib : {
			json : '\nconst cojson::details::clas<{10}>& {10}::json() noexcept {{|}\n}',
			top	: {
				object: 'O<{8}{-2}{|}\n>',
				objects: 'V<stdvector<decltype({7}), &{7}>, &{8}::json>', 
				"{}":   'details::ValueObject<>',
				"[]":   'V<>'
			},
			value : {
				bool	: CojsonGenerator.Template.compact.property,
				float	: CojsonGenerator.Template.compact.property,
				uint	: CojsonGenerator.Template.compact.property,
				int		: CojsonGenerator.Template.compact.property,
				string	: 'P<{11}, {1}::{3}, decltype({8}::{7}), &{8}::{7}>{-1}', 
				strings	: 'V<{11}, {1}::{3}, decltype({11}::{7}), &{11}::{7}>{-1}',
				vector	: 'V<{11}, {1}::{3}, decltype({8}::{7}), &{8}::{7}>{-1}',
				object	: 'P<{11}, {1}::{3}, {8}, &{11}::{7}, {8}::json>{-1}',
				objects	: 'P<{11}, {1}::{3}, decltype({11}::{7}), &{11}::{7}, {8}::json>{-1}',
				list	: 'P<{8}, {1}::{3}{-2}{|}\n>{-1}',
				"{}"	: 'P<{11}, {1}::{3}, details::ValueObject<>>{-1}',
				"[]"	: 'P<{8}, {1}::{3}, V<>>{-1}'
			},
			member : {
				bool	: CojsonGenerator.Template.compact.property,
				float	: CojsonGenerator.Template.compact.property,
				uint	: CojsonGenerator.Template.compact.property,
				int		: CojsonGenerator.Template.compact.property,
				string	: 'P<{11}, {1}::{3}, decltype({8}::{7}), &{8}::{7}>{-1}', 
				strings	: 'V<{11}, {1}::{3}, decltype({11}::{7}), &{11}::{7}>{-1}',
				vector	: 'V<{11}, {1}::{3}, decltype({11}::{7}), &{11}::{7}>{-1}',
				object	: 'P<{11}, {1}::{3}, {8}, &{11}::{7}, {8}::json>{-1}',
				objects	: 'P<{11}, {1}::{3}, decltype({11}::{7}), &{11}::{7}, {8}::json>{-1}', 
				list	: 'P<{11}, {1}::{3}{-2}{|}\n>{-1}',
				"{}"	: 'P<{11}, {1}::{3}, details::ValueObject<>>{-1}',
				"[]"	: 'P<{11}, {1}::{3}, V<>>{-1}'
			}
		},
		stdlist : {
			json : '\nconst cojson::details::value& json() noexcept {{|}\n}',
			top	: {
				list:   'V<{|}\n>',
				object: 'V<{|}\n>',
				"{}":   'details::ValueObject<>',
				"[]":   'V<>'				
			},
			value : {
				bool	: CojsonGenerator.Template.compact.value,
				float	: CojsonGenerator.Template.compact.value,
				uint	: CojsonGenerator.Template.compact.value,
				int		: CojsonGenerator.Template.compact.value,
				string	: 'S<decltype({7}), &{7}>{-1}',
				strings	: 'V<decltype({7}), &{7}>{-1}',
				vector	: 'V<{5}, &{7}>{-1}',
				object  : 'V<pointer<{8}, &{7}>, {8}::json>{-1}', 
				objects : 'V<stdvector<decltype({7}),&{7}>, {8}::json>{-1}', 
				list	: 'V<{|}\n>{-1}',
				"{}"	: 'details::ValueObject<>{-1}',
				"[]"	: 'V<>{-1}'
				
			},
			member : {
				bool	: CojsonGenerator.Template.compact.member,
				float	: CojsonGenerator.Template.compact.member,
				uint	: CojsonGenerator.Template.compact.member,
				int		: CojsonGenerator.Template.compact.member,
				string	: 'M<{1}::{3}, V<decltype({7}), &{7}>{-1}>>{-1}',
				strings	: 'M<{1}::{3}, V<decltype({7}), &{7}>>{-1}',
				vector	: 'M<{1}::{3}, V<{5}, &{7}> >{-1}',
				object	: 'M<{1}::{3}, V<{|}\n>>{-1}',
				list	: 'M<{1}::{3}, V<{|}\n>>{-1}',
				"{}"	: 'M<{1}::{3}, details::ValueObject<>>{-1}',
				"[]"	: 'M<{1}::{3}, V<>>{-1}'
			}
		},
		stdvar : {
			json : '\nconst cojson::details::value& json() noexcept {{|}\n}',
			top	: {
				list:   'V<{|}\n>',
				object: 'V<{|}\n>',
				strings: 'details::ValueStdVector<decltype({7}), &{7}>',
				objects: 'V<stdvector<decltype({7}), &{7}>,\n\t&{8}::json>',
				"{}":   'details::ValueObject<>',
				"[]":   'V<>'				
			},
			value : {
				bool	: CojsonGenerator.Template.compact.value,
				float	: CojsonGenerator.Template.compact.value,
				uint	: CojsonGenerator.Template.compact.value,
				int		: CojsonGenerator.Template.compact.value,
				string	: 'S<decltype({7}), &{7}>{-1}',
				strings	: 'V<decltype({7}), &{7}, void>{-1}',
				vector	: 'V<decltype({7}), &{7}, void>{-1}',
				object  : 'V<{|}>{-1}', 
				objects : 'V<stdvector<decltype({7}),&{7}>, {8}::json>{-1}', 
				list	: 'V<{|}\n>{-1}',
				"{}"	: 'details::ValueObject<>{-1}',
				"[]"	: 'V<>{-1}'				
			},
			member : {
				bool	: CojsonGenerator.Template.compact.member,
				float	: CojsonGenerator.Template.compact.member,
				uint	: CojsonGenerator.Template.compact.member,
				int		: CojsonGenerator.Template.compact.member,
				string	: 'M<{1}::{3}, V<decltype({7}), &{7}>>{-1}',
				strings	: 'M<{1}::{3}, V<decltype({7}), &{7}, void>>{-1}',
				vector	: 'M<{1}::{3}, V<decltype({7}), &{7}, void>>{-1}',
				object	: 'M<{1}::{3}, V<{|}\n>>{-1}',
				objects : 'M<{1}::{3}, V<stdvector<decltype({7}),&{7}>, {8}::json>>{-1}',
				list	: 'M<{1}::{3}, V<{|}\n>>{-1}',
				"{}"	: 'M<{1}::{3}, details::ValueObject<>>{-1}',
				"[]"	: 'M<{1}::{3}, V<>>{-1}'
			}			
		},
		line :'\n/**************************************************************************/'
	},	
	verbose : {
		using_cojson: 'using namespace cojson;\nusing namespace cojson::details;',
		return_	: 'return {|}();',
		progmem :`inline cojson::cstring {1}() noexcept { static const char l[] __attribute__((progmem))= "{2}"; return cojson::cstring(l);}`,
		variables : {
			json : '\nconst cojson::details::value& json() noexcept {{|}\n}',
			top	: {
				list:   'ValueArray<{|}\n>',
				object: 'ValueObject<{|}\n>',
				"{}":   'ValueObject<>',
				"[]":   'ValueArray<>'				
			},
			value : {
				bool	: CojsonGenerator.Template.verbose.value,
				float	: CojsonGenerator.Template.verbose.value,
				uint	: CojsonGenerator.Template.verbose.value,
				int		: CojsonGenerator.Template.verbose.value,
				string	: 'ValueString<std::extent<decltype({7}),0>::value, {7}>{-1}',
				strings	: 'ValueStrings<std::extent<decltype({7}),0>::value,std::extent<decltype({7}),1>::value,{7}>{-1}',
				vector	: 'ValueVector<{5}, std::extent<decltype({7}),0>::value, {7}>{-1}',
				object  : 'ValueObjectAccessor<cojson::accessor::pointer<decltype({7}),&{7}>,&{8}::json>{-1}', 
				objects : 'ValueObjectAccessor<cojson::accessor::array<\n' +
			  		'\tstd::remove_all_extents<decltype({7})>::type,\n\tstd::extent<decltype({7}),0>::value,{7}>,\n' +
			  		'\t&{8}::json>{-1}', 
				plain	: 'ValueObject<{|}\n>{-1}',
				list	: 'ValueArray<{|}\n>{-1}',
				"{}"	: 'ValueObject<>{-1}',
				"[]"	: 'ValueArray<>{-1}'
			},
			member : {
				bool	: CojsonGenerator.Template.verbose.member,
				float	: CojsonGenerator.Template.verbose.member,
				uint	: CojsonGenerator.Template.verbose.member,
				int		: CojsonGenerator.Template.verbose.member,
				string	: 'MemberValue<{1}::{3}, ValueString<std::extent<decltype({7}),0>::value, {7}>>{-1}',
				strings	: 'MemberValue<{1}::{3}, ValueStrings<std::extent<decltype({7}),0>::value,std::extent<decltype({7}),1>::value,{7}>>{-1}',
				vector	: 'MemberValue<{1}::{3}, ValueVector<{5}, countof({7}), {7}>>{-1}',
				object	: 'MemberValue<{1}::{3}, ValueObjectAccessor<cojson::accessor::pointer<decltype({7}),&{7}>,&{8}::json>>{-1}',
				objects	: 'MemberValue<{1}::{3}, ValueObjectAccessor<cojson::accessor::array<\n' +
			  		'\tstd::remove_all_extents<decltype({7})>::type,\n\tstd::extent<decltype({7}),0>::value,{7}>,\n' +
			  		'\t&{8}::json>{-1}', 
				plain	: 'MemberValue<{1}::{3}, ValueObject<{|}>\n>{-1}',
				list	: 'MemberValue<{1}::{3}, ValueArray<{|}>\n>{-1}',
				"{}"	: 'MemberValue<{1}::{3}, ValueObject<>>{-1}',
				"[]"	: 'MemberValue<{1}::{3}, ValueArray<>>{-1}'
			}
		},
		list : {
			json : '\nconst cojson::details::value& json() noexcept {{|}\n}',
			top	: {
				list:   'ValueArray<{|}\n>',
				object: 'ValueObject<{|}\n>',
				"{}":   'ValueObject<>',
				"[]":   'ValueArray<>'	
			},
			value : {
				bool	: CojsonGenerator.Template.verbose.value,
				float	: CojsonGenerator.Template.verbose.value,
				uint	: CojsonGenerator.Template.verbose.value,
				int		: CojsonGenerator.Template.verbose.value,
				string	: 'ValueString<std::extent<decltype({7}),0>::value, {7}>{-1}',
				object  : 'ValueObjectAccessor<cojson::accessor::pointer<decltype({7}),&{7}>,&{8}::json>{-1}', 
				objects : 'ValueObjectAccessor<cojson::accessor::array<\n' +
			  	'\tstd::remove_all_extents<decltype({7})>::type,\n\tstd::extent<decltype({7}),0>::value,{7}>,\n' +
				'\t&{8}::json>{-1}', 
				list	: 'ValueArray<{|}\n>{-1}',
				"{}"	: 'ValueObject<>{-1}',
				"[]"	: 'ValueArray<>{-1}'				
			},
			member : {
				bool	: CojsonGenerator.Template.verbose.member,
				float	: CojsonGenerator.Template.verbose.member,
				uint	: CojsonGenerator.Template.verbose.member,
				int		: CojsonGenerator.Template.verbose.member,
				string	: 'MemberValue<{1}::{3}, ValueString<std::extent<decltype({7}),0>::value, {7}>>{-1}',
				strings	: 'MemberValue<{1}::{3}, ValueStrings<std::extent<decltype({7}),0>::value,std::extent<decltype({7}),1>::value,{7}>>{-1}',
				vector	: 'MemberValue<{1}::{3}, ValueVector<{5}, countof({7}), {7}>>{-1}',
				object	: 'MemberValue<{1}::{3}, ValueObject<{|}\n>>{-1}',
				list	: 'MemberValue<{1}::{3}, ValueArray<{|}\n>>{-1}',
				"{}"	: 'MemberValue<{1}::{3}, ValueObject<>>{-1}',
				"[]"	: 'MemberValue<{1}::{3}, ValueArray<>>{-1}'
			}
		},
		members : {
			json : '\nconst cojson::details::clas<{10}>& {10}::json() noexcept {{|}\n}',
			top	: {
				object: 'ObjectClass<{8}{-2}{|}\n>',
				objects: 'ValueObjectAccessor<cojson::accessor::array<\n' +
				  	'\tstd::remove_all_extents<decltype({7})>::type,\n\tstd::extent<decltype({7}),0>::value,{7}>,\n' +
					'\t&{8}::json>',
				"{}":   'ValueObject<>',
				"[]":   'ValueArray<>'	 
			},
			value : {
				bool	: CojsonGenerator.Template.verbose.property,
				float	: CojsonGenerator.Template.verbose.property,
				uint	: CojsonGenerator.Template.verbose.property,
				int		: CojsonGenerator.Template.verbose.property,
				string	: 'PropertyString<{11}, {1}::{3}, std::extent<decltype({8}::{7}),0>::value, &{8}::{7}>{-1}', 
				strings	: 'PropertyStrings<{11}, {1}::{3}, std::extent<decltype({11}::{7}),0>::value, std::extent<decltype({11}::{7}),1>::value, &{11}::{7}>{-1}',
				vector	: 'PropertyVector<{11}, {1}::{3}, std::remove_all_extents<decltype({8}::{7})>::type, std::extent<decltype({8}::{7})>::value, &{8}::{7}>{-1}',
				object	: 'PropertyObject<{11}, {1}::{3}, decltype({11}::{7}), &{11}::{7}, decltype({11}::{7})::json>{-1}',
				objects	: 'PropertyArrayOfObjects<{11}, {1}::{3},\n\tstd::remove_all_extents<decltype({11}::{7})>::type,\n'+
				  		  '\tstd::extent<decltype({11}::{7}),0>::value,\n' +
				  		  '\t&{11}::{7},\n\tstd::remove_all_extents<decltype({11}::{7})>::type::json>{-1}',
				list	: 'PropertyList<{8}, {1}::{3}{-2}{|}\n>{-1}',
				"{}"	: 'PropertyExternValue<{11}, {1}::{3}, ValueObject<>>{-1}',
				"[]"	: 'PropertyExternValue<{11}, {1}::{3}, ValueArray<>>{-1}'
			},
			member : {
				bool	: CojsonGenerator.Template.verbose.property,
				float	: CojsonGenerator.Template.verbose.property,
				uint	: CojsonGenerator.Template.verbose.property,
				int		: CojsonGenerator.Template.verbose.property,
				string	: 'PropertyString<{11}, {1}::{3}, std::extent<decltype({11}::{7}),0>::value, &{11}::{7}>{-1}', 
				strings	: 'PropertyStrings<{11}, {1}::{3}, std::extent<decltype({11}::{7}),0>::value, std::extent<decltype({11}::{7}),1>::value, &{11}::{7}>{-1}',
				vector	: 'PropertyVector<{11}, {1}::{3}, std::remove_all_extents<decltype({11}::{7})>::type, std::extent<decltype({11}::{7})>::value, &{11}::{7}>{-1}',
				object	: 'PropertyObject<{11}, {1}::{3}, decltype({11}::{7}), &{11}::{7}, decltype({11}::{7})::json>{-1}',
				objects	: 'PropertyArrayOfObjects<{11}, {1}::{3},\n\tstd::remove_all_extents<decltype({11}::{7})>::type,\n'+
						  '\tstd::extent<decltype({11}::{7}),0>::value,\n' +
						  '\t&{11}::{7},\n\tstd::remove_all_extents<decltype({11}::{7})>::type::json>{-1}',
				list	: 'PropertyList<{11}, {1}::{3}{-2}{|}\n>{-1}',
				"{}"	: 'PropertyExternValue<{11}, {1}::{3}, ValueObject<>>{-1}',
				"[]"	: 'PropertyExternValue<{11}, {1}::{3}, ValueArray<>>{-1}'
			}
		},
		functions : {
			json : '\nconst cojson::details::value& json() noexcept {{|}\n}',
			top	: {
				list:   'ValueArray<{|}\n>',
				object: 'ValueObject<{|}\n>',
				"{}":   'ValueObject<>',
				"[]":   'ValueArray<>'
			},
			value : {
				bool	: CojsonGenerator.Template.verbose.functions,
				float	: CojsonGenerator.Template.verbose.functions,
				uint	: CojsonGenerator.Template.verbose.functions,
				int		: CojsonGenerator.Template.verbose.functions,
				string	: 'ValueString<std::extent<decltype({7}),0>::value, {7}>{-1}',
				strings	: 'ValueStrings<std::extent<decltype({7}),0>::value,std::extent<decltype({7}),1>::value,{7}>{-1}',
				vector	: 'ValueAccessor<accessor::vector<std::remove_pointer<std::result_of<\n\tdecltype({7}_array)&(cojson::size_t)>::type>::type, &{7}_array>>{-1}',
				object  : 'ValueObjectAccessor<cojson::accessor::pointer<decltype({7}),&{7}>,&{8}::json>{-1}', 
				objects : 'ValueObjectAccessor<cojson::accessor::array<\n' +
			  		'\tstd::remove_all_extents<decltype({7})>::type,\n\tstd::extent<decltype({7}),0>::value,{7}>,\n' +
			  		'\t&{8}::json>{-1}', 
				plain	: 'ValueObject<{|}\n>{-1}',
				list	: 'ValueArray<{|}\n>{-1}',
				"{}"	: 'ValueObject<>{-1}',
				"[]"	: 'ValueArray<>{-1}'
			},
			member : {
				bool	: CojsonGenerator.Template.verbose.getters,
				float	: CojsonGenerator.Template.verbose.getters,
				uint	: CojsonGenerator.Template.verbose.getters,
				int		: CojsonGenerator.Template.verbose.getters,
				string	: 'MemberValue<{1}::{3}, ValueString<std::extent<decltype({7}),0>::value, {7}>>{-1}',
				strings	: 'MemberValue<{1}::{3}, ValueStrings<std::extent<decltype({7}),0>::value,std::extent<decltype({7}),1>::value,{7}>>{-1}',
				vector	: 'MemberValue<{1}::{3}, ValueAccessor<accessor::vector<std::remove_pointer<\n\tstd::result_of<decltype({7}_array)&(cojson::size_t)>::type>::type, &{7}_array>>>{-1}',
				object	: 'MemberValue<{1}::{3}, ValueObjectAccessor<cojson::accessor::pointer<decltype({7}),&{7}>,&{8}::json>>{-1}',
				objects	: 'MemberValue<{1}::{3}, ValueObjectAccessor<cojson::accessor::array<\n' +
			  		'\tstd::remove_all_extents<decltype({7})>::type,\n\tstd::extent<decltype({7}),0>::value,{7}>,\n' +
			  		'\t&{8}::json>{-1}', 
				plain	: 'MemberValue<{1}::{3}, ValueObject<{|}>\n>{-1}',
				list	: 'MemberValue<{1}::{3}, ValueArray<{|}\n>>{-1}',
				"{}"	: 'MemberValue<{1}::{3}, ValueObject<>\n>{-1}',
				"[]"	: 'MemberValue<{1}::{3}, ValueArray<>\n>{-1}'
			}
		},
		methods : {
			json : '\nconst cojson::details::clas<{10}>& {10}::json() noexcept {{|}\n}',
			top	: {
				object: 'ObjectClass<{8}{-2}{|}\n>',
				objects: 'ValueObjectAccessor<cojson::accessor::array<\n' +
				  	'\tstd::remove_all_extents<decltype({7})>::type,\n\tstd::extent<decltype({7}),0>::value,{7}>,\n' +
					'\t&{8}::json>',
				"{}":   'ValueObject<>',
				"[]":   'ValueArray<>'	 
			},
			value : {
				bool	: CojsonGenerator.Template.verbose.methods,
				float	: CojsonGenerator.Template.verbose.methods,
				uint	: CojsonGenerator.Template.verbose.methods,
				int		: CojsonGenerator.Template.verbose.methods,
				string	: 'PropertyString<{11}, {1}::{3}, std::extent<decltype({8}::{7}),0>::value, &{8}::{7}>{-1}', 
				strings	: 'PropertyStrings<{11}, {1}::{3}, std::extent<decltype({11}::{7}),0>::value, std::extent<decltype({11}::{7}),1>::value, &{11}::{7}>{-1}',
				vector	: 'PropertyVector<{11}, {1}::{3}, std::remove_all_extents<decltype({8}::{7})>::type, std::extent<decltype({8}::{7})>::value, &{8}::{7}>{-1}',
				object	: 'PropertyObject<{11}, {1}::{3}, decltype({11}::{7}), &{11}::{7}, decltype({11}::{7})::json>{-1}',
				objects	: 'PropertyArrayOfObjects<{11}, {1}::{3},\n\tstd::remove_all_extents<decltype({11}::{7})>::type,\n'+
		  		  '\tstd::extent<decltype({11}::{7}),0>::value,\n' +
		  		  '\t&{11}::{7},\n\tstd::remove_all_extents<decltype({11}::{7})>::type::json>{-1}',
				list	: 'PropertyList<{8}, {1}::{3}{-2}{|}\n>{-1}',
				"{}"	: 'PropertyExternValue<{11}, {1}::{3}, ValueObject<>>{-1}',
				"[]"	: 'PropertyExternValue<{11}, {1}::{3}, ValueArray<>>{-1}'
			},
			member : {
				bool	: CojsonGenerator.Template.verbose.methods,
				float	: CojsonGenerator.Template.verbose.methods,
				uint	: CojsonGenerator.Template.verbose.methods,
				int		: CojsonGenerator.Template.verbose.methods,
				string	: 'PropertyString<{11}, {1}::{3}, std::extent<decltype({11}::{7}),0>::value, &{11}::{7}>{-1}', 
				strings	: 'PropertyStrings<{11}, {1}::{3}, std::extent<decltype({11}::{7}),0>::value, std::extent<decltype({11}::{7}),1>::value, &{11}::{7}>{-1}',
				vector	: 'PropertyVector<{11}, {1}::{3}, std::remove_all_extents<decltype({11}::{7})>::type, std::extent<decltype({11}::{7})>::value, &{11}::{7}>{-1}',
				object	: 'PropertyObject<{11}, {1}::{3}, decltype({11}::{7}), &{11}::{7}, decltype({11}::{7})::json>{-1}',
				objects	: 'PropertyArrayOfObjects<{11}, {1}::{3},\n\tstd::remove_all_extents<decltype({11}::{7})>::type,\n'+
						  '\tstd::extent<decltype({11}::{7}),0>::value,\n' +
						  '\t&{11}::{7},\n\tstd::remove_all_extents<decltype({11}::{7})>::type::json>{-1}',
				list	: 'PropertyList<{11}, {1}::{3}{-2}{|}\n>{-1}',
				"{}"	: 'PropertyExternValue<{11}, {1}::{3}, ValueObject<>>{-1}',
				"[]"	: 'PropertyExternValue<{11}, {1}::{3}, ValueArray<>>{-1}'
			}
		},
		stdlib : {
			json : '\nconst cojson::details::clas<{10}>& {10}::json() noexcept {{|}\n}',
			top	: {
				object: 'ObjectClass<{8}{-2}{|}\n>',
				objects: 'ValueObjectAccessor<cojson::accessor::stdvector<decltype({7}), &{7}>,\n\t&{8}::json>',
				"{}":   'ValueObject<>',
				"[]":   'ValueArray<>'	 
			},
			value : {
				bool	: CojsonGenerator.Template.verbose.property,
				float	: CojsonGenerator.Template.verbose.property,
				uint	: CojsonGenerator.Template.verbose.property,
				int		: CojsonGenerator.Template.verbose.property,
				string	: 'PropertyStdString<{11}, {1}::{3}, decltype({8}::{7}), &{8}::{7}>{-1}', 
				strings	: 'PropertyStdVector<{11}, {1}::{3}, decltype({11}::{7}), &{11}::{7}>{-1}',
				vector	: 'PropertyStdVector<{11}, {1}::{3}, decltype({8}::{7}), &{8}::{7}>{-1}',
				object	: 'PropertyObject<{11}, {1}::{3}, decltype({11}::{7}), &{11}::{7}, decltype({11}::{7})::json>{-1}',
				objects	: 'PropertyStdVector<{11}, {1}::{3}, decltype({11}::{7}), &{11}::{7}, decltype({11}::{7})::value_type::json>{-1}',
				list	: 'PropertyList<{8}, {1}::{3}{-2}{|}\n>{-1}',
				"{}"	: 'PropertyExternValue<{11}, {1}::{3}, ValueObject<>>{-1}',
				"[]"	: 'PropertyExternValue<{11}, {1}::{3}, ValueArray<>>{-1}'
			},
			member : {
				bool	: CojsonGenerator.Template.verbose.property,
				float	: CojsonGenerator.Template.verbose.property,
				uint	: CojsonGenerator.Template.verbose.property,
				int		: CojsonGenerator.Template.verbose.property,
				string	: 'PropertyStdString<{11}, {1}::{3}, decltype({8}::{7}), &{8}::{7}>{-1}', 
				strings	: 'PropertyStdVector<{11}, {1}::{3}, decltype({11}::{7}), &{11}::{7}>{-1}',
				vector	: 'PropertyStdVector<{11}, {1}::{3}, decltype({11}::{7}), &{11}::{7}>{-1}',
				object	: 'PropertyObject<{11}, {1}::{3}, decltype({11}::{7}), &{11}::{7}, decltype({11}::{7})::json>{-1}',
				objects	: 'PropertyStdVector<{11}, {1}::{3}, decltype({11}::{7}), &{11}::{7}, decltype({11}::{7})::value_type::json>{-1}', 
				list	: 'PropertyList<{11}, {1}::{3}{-2}{|}\n>{-1}',
				"{}"	: 'PropertyExternValue<{11}, {1}::{3}, ValueObject<>>{-1}',
				"[]"	: 'PropertyExternValue<{11}, {1}::{3}, ValueArray<>>{-1}'
			}
		},
		stdlist : {
			json : '\nconst cojson::details::value& json() noexcept {{|}\n}',
			top	: {
				list:   'ValueArray<{|}\n>',
				object: 'ValueObject<{|}\n>',
				"{}":   'ValueObject<>',
				"[]":   'ValueArray<>'	
			},
			value : {
				bool	: CojsonGenerator.Template.verbose.value,
				float	: CojsonGenerator.Template.verbose.value,
				uint	: CojsonGenerator.Template.verbose.value,
				int		: CojsonGenerator.Template.verbose.value,
				string	: 'ValueStdString<decltype({7}), &{7}>{-1}',
				strings	: 'ValueStdVector<decltype({7}), &{7}>{-1}',
				vector	: 'ValueStdVector<decltype({7}), &{7}>{-1}',
				object  : 'ValueObjectAccessor<cojson::accessor::pointer<decltype({7}),&{7}>,&{8}::json>{-1}', 
				objects : 'ValueObjectAccessor<cojson::accessor::stdvector<decltype({7}),&{7}>,&{8}::json>{-1}', 
				list	: 'ValueArray<{|}\n>{-1}',
				"{}"	: 'ValueObject<>{-1}',
				"[]"	: 'ValueArray<>{-1}'
				
			},
			member : {
				bool	: CojsonGenerator.Template.verbose.member,
				float	: CojsonGenerator.Template.verbose.member,
				uint	: CojsonGenerator.Template.verbose.member,
				int		: CojsonGenerator.Template.verbose.member,
				string	: 'MemberValue<{1}::{3}, ValueString<std::extent<decltype({7}),0>::value, {7}>>{-1}',
				strings	: 'MemberValue<{1}::{3}, ValueStrings<std::extent<decltype({7}),0>::value,std::extent<decltype({7}),1>::value,{7}>>{-1}',
				vector	: 'MemberValue<{1}::{3}, ValueVector<{5}, countof({7}), {7}>>{-1}',
				object	: 'MemberValue<{1}::{3}, ValueObject<{|}\n>>{-1}',
				list	: 'MemberValue<{1}::{3}, ValueArray<{|}\n>>{-1}',
				"{}"	: 'MemberValue<{1}::{3}, ValueObject<>>{-1}',
				"[]"	: 'MemberValue<{1}::{3}, ValueArray<>>{-1}'
			}
		},
		stdvar : {
			json : '\nconst cojson::details::value& json() noexcept {{|}\n}',
			top	: {
				list:   'ValueArray<{|}\n>',
				object: 'ValueObject<{|}\n>',
				objects: 'ValueObjectAccessor<cojson::accessor::stdvector<decltype({7}), &{7}>,\n\t&{8}::json>',
				"{}":   'ValueObject<>',
				"[]":   'ValueArray<>'
			},
			value : {
				bool	: CojsonGenerator.Template.verbose.value,
				float	: CojsonGenerator.Template.verbose.value,
				uint	: CojsonGenerator.Template.verbose.value,
				int		: CojsonGenerator.Template.verbose.value,
				string	: 'ValueStdString<decltype({7}), &{7}>{-1}',
				strings	: 'ValueStdVector<decltype({7}), &{7}>{-1}',
				vector	: 'ValueStdVector<decltype({7}), &{7}>{-1}',
				object  : 'ValueObject<{|}>{-1}', 
				objects : 'ValueObjectAccessor<cojson::accessor::stdvector<decltype({7}),&{7}>,&{8}::json>{-1}', 
				list	: 'ValueArray<{|}\n>{-1}',
				"{}"	: 'ValueObject<>{-1}',
				"[]"	: 'ValueArray<>{-1}'
				
			},
			member : {
				bool	: CojsonGenerator.Template.verbose.member,
				float	: CojsonGenerator.Template.verbose.member,
				uint	: CojsonGenerator.Template.verbose.member,
				int		: CojsonGenerator.Template.verbose.member,
				string	: 'MemberValue<{1}::{3}, ValueStdString<{1}::{3}, decltype({7}), &{7}>>{-1}',
				strings	: 'MemberValue<{1}::{3}, ValueStdVector<{1}::{3}, decltype({7}), &{7}>>{-1}',
				vector	: 'MemberValue<{1}::{3}, ValueStdVector<{1}::{3}, &{7}>>{-1}',
				object	: 'MemberValue<{1}::{3}, ValueObject<{|}\n>>{-1}',
				objects : 'MemberValue<{1}::{3},\n\tValueObjectAccessor<cojson::accessor::stdvector<\n\tdecltype({7}),&{7}>,&{8}::json>>{-1}',
				list	: 'MemberValue<{1}::{3}, ValueArray<{|}>\n>{-1}',
				"{}"	: 'MemberValue<{1}::{3}, ValueObject<>>{-1}',
				"[]"	: 'MemberValue<{1}::{3}, ValueArray<>>{-1}'
			}			
		},
		line :'\n/**************************************************************************/'
	},
	test : `
	using cojson::details::error_t;
    if( +input.error() ) {
    	std::cerr << "Lexer errors: " << std::hex << (int)+input.error() << std::endl;
    	return 1;
    }
    if( +output.error() ) {
    	std::cerr << "Output errors: " << std::hex << (int)+output.error() << std::endl;
    	return 2;
    }
	`,
	message : {
		not_supported:  '/* Unsupported data type: {1} */',
		not_supported2: '/* Unsupported data type: "{1}" : {2} */',
		null_replaced:  '/* Encountered {1} : null, assumed string instead */',
		json_error : '/* Error processing input\n{1}\n*/',
		invalid_variant : '/* Invalid variant specified: {1}\n*/',
		name_too_long :  '\n\t\t/* Name is too long */',
		name_collision :  '/* Name collision : {1} */',
		name_collision_new :  '/* Name collision : {1}\n   Use --members or --methods instead of --variables or --fucntions */',
		type_collision: ("/* type collision '{1}' is '{2}' and '{3}' is '{4}' */"),		
	}
};

CojsonGenerator.Options = {
	throw_json_errors		: false,
	write_json_errors		: false,
	write_json				: false,
	build_intro				: false,
	variant					: 'members',
	prefix					: '',
	suffix					: '',
	prefixes				: { variables: '', functions: '', members: '', methods: '' },
	suffixes				: { variables: '', functions: '', members: '', methods: '' },
	classname				: 'MyClass',
	namespace				: 'MyApp',
	name					: 'name',
	compact					: false,
	example					: false,
	avr						: false,
	min_strlen				: 32,
	textstyle				: CojsonGenerator.TextStyle,
	strings_with_traling_0	: true
};

CojsonGenerator.fromText = function (text, options) {
	var gen = new CojsonGenerator(options);
	try {
		gen.fromText(text);
	} catch(e) {
		if( options.rethrow ) {
			throw e;
		}
		console.error(e);
		return "";
	}
	return gen.output();
};

CojsonGenerator.Keywords = [
	"alignas", "alignof", "and", "and_eq", "asm", "atomic_cancel",
	"atomic_commit", "atomic_noexcept", "auto", "bitand", "bitor", "bool",
	"break", "case", "catch", "char", "char16_t", "char32_t", "class",
	"compl", "concept", "const", "constexpr", "const_cast", "continue",
	"co_await", "co_return", "co_yield", "decltype", "default", "delete",
	"do", "double", "dynamic_cast", "else", "enum", "explicit", "export",
	"extern", "false", "float", "for", "friend", "goto", "if", "import",
	"inline", "int", "long", "module", "mutable", "name", "namespace", "new",
	"noexcept", "not", "not_eq", "nullptr", "operator", "or", "or_eq",
	"private", "protected", "public", "register", "reinterpret_cast",
	"requires", "return", "short", "signed", "sizeof", "static",
	"static_assert", "static_cast", "struct", "switch", "synchronized",
	"template", "this", "thread_local", "throw", "true", "try", "typedef",
	"typeid", "typename", "union", "unsigned", "using", "virtual", "void",
	"volatile", "wchar_t", "while", "xor", "xor_eq",
	"NULL", "TRUE", "FALSE", "__asm__", "_Complex", "_Bool", "_Imaginary",
	"__FILE__", "__LINE__", "minor", "major", "BIG_ENDIAN", "LITTLE_ENDIAN",
	"M", "V", "O", 'P', "resource", "json",
	"ValueObject", "MemberPointer", "MemberValue", "ValueVector", "ValuePointer",
	"ValueString", "ValueStrings", "ValueArray", "ObjectClass", "PropertyScalarMember",
	"PropertyString", "PropertyStrings", "PropertyVector", "PropertyObject",
	"PropertyArrayOfObjects","PropertyList"	
];


if(typeof module === typeof undefined ){
	// stub for browser environment
    module = {}; // jshint ignore:line
}

module.exports = CojsonGenerator;