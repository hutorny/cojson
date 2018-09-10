/*
 * Copyright (C) 2018 Eugene Hutorny <eugene@hutorny.in.ua>
 *
 * uautils.js - COJSON Code Generation Facilities
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

function writeFile(strData, strFileName, strMimeType) {
	//Credits to Lifecube @ stackoverflow
	//https://stackoverflow.com/questions/21012580/is-it-possible-to-write-data-to-file-using-only-javascript#21012821
    var D = document,
        A = arguments,
        a = D.createElement("a"),
        d = A[0],
        n = A[1],
        t = A[2] || "text/plain";

    //build download link:
    a.href = "data:" + strMimeType + "charset=utf-8," + escape(strData);


    if (window.MSBlobBuilder) { // IE10
        var bb = new MSBlobBuilder();
        bb.append(strData);
        return navigator.msSaveBlob(bb, strFileName);
    } /* end if(window.MSBlobBuilder) */



    if ('download' in a) { //FF20, CH19
        a.setAttribute("download", n);
        a.innerHTML = "downloading...";
        D.body.appendChild(a);
        setTimeout(function() {
            var e = D.createEvent("MouseEvents");
            e.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            a.dispatchEvent(e);
            D.body.removeChild(a);
        }, 66);
        return true;
    }; /* end if('download' in a) */



    //do iframe dataURL download: (older W3)
    var f = D.createElement("iframe");
    D.body.appendChild(f);
    f.src = "data:" + (A[2] ? A[2] : "application/octet-stream") + (window.btoa ? ";base64" : "") + "," + (window.btoa ? window.btoa : escape)(strData);
    setTimeout(function() {
        D.body.removeChild(f);
    }, 333);
    return true;
}

function readFile(file, dataHandler, errorHandler) {
	  var reader = new FileReader();
	  reader.onload = dataHandler;
	  reader.onerror = errorHandler;
	  reader.readAsText(file, "UTF-8");
}

var Options = { 
		min_strlen				: 32,
		write_json_errors		: true,
		write_json				: false,
		build_intro				: true,
		variant					: 'members',
		prefix					: '',
		suffix					: '',
		classname				: 'MyClass',
		namespace				: 'MyApp',
		name					: 'name',
		compact					: false,
		avr						: false,
		example					: true,
		strings_with_traling_0	: true,
		rethrow 				: true,
		options_version 		: 2
	};
	const Sample = `{ 
"list" : [1, "aaaa"],
"led" : true, 
"hello" : "A text of this length",
"int" : -1,
"unsigned" : 1,
"vect" : [1,2,3],
"strings" : ["a","zzzzzzzzzzzzz"],
"obj" : { "int" : -1, "z" : { "str" : "sssss" }},
"objs" : [ {"x": 1, "y": 2 }, {"x": 1, "y": 2 } ],
"items": [{}, [1], true]	
}`;
var Delay = null;		
function Run() {
	if( Delay ) GetOptions();
	Delay = null;
	Cpp.session.setValue(
		CojsonGenerator.fromText(Json.session.getValue(), Options));
}
function CopyCpp() {
	var sel = Cpp.selection.toJSON();
	Cpp.selectAll();
	Cpp.focus();
	document.execCommand('copy');
	Cpp.selection.fromJSON(sel); 			
}
function PasteJson() {
	Json.session.setValue('');
	Json.focus();
	Json.execCommand('paste');
}
function Erase() {
	Json.session.setValue('');
	Cpp.session.setValue('');
}
function SaveCpp() {
	var text = 
		CojsonGenerator.fromText(Json.session.getValue(), Options);
	Cpp.session.setValue(text);
	writeFile(text,'myapp.hpp','plain/text');
}
function ReadCpp(evt) {
	if(! window.FileReader ) {
		//TODO disable input
		return;
	}
	if( evt.target.files.length ) {
		readFile(evt.target.files[0], 
			(evt)=>{ 
				var text = evt.target.result;
				var err = '';
				if( text ) try {
					JSON.parse(text);
					good = true;
				} catch(e) {
					err = e.message;
					console.log(e);
				}
				if( err )
					Cpp.session.setValue('/* ' + err + ' */')
				Json.session.setValue(text);
				if( good )
					Cpp.session.setValue(CojsonGenerator.fromText(
							Json.session.getValue(), Options));
			}, 
			(evt) => {
				Cpp.session.setValue('/*' + evt.error.message + '*/') 
				console.log(evt.error);
			});
		
	}
	
}
function OnChange() {
	if( Delay ) clearTimeout(Delay);
	Delay = setTimeout(Run, 300);
}
function BindControl(c) {
	c && (c.onchange = OnChange);
}
function SetOptionValue(id, value, field) {
	var a = document.querySelector('#' + id);
	a && (a[field||'value'] = value);			
	
}
function GetOptionValue(id, field) {
	var a = document.querySelector('#' + id);
	a && (Options[id]  = a[field||'value']);			
	
}
function SetOptions() {
	['name', 'classname', 'namespace'].forEach((v)=>SetOptionValue(v, Options[v]));
	document.querySelectorAll('input[name="variant"]').forEach((v)=>v.checked = v.value === Options.variant);
	['example', 'compact','avr'].forEach((v)=>SetOptionValue(v, Options[v], 'checked'));
}
function GetOptions() {
	['name', 'classname', 'namespace'].forEach((v)=>GetOptionValue(v));
	document.querySelectorAll('input[name="variant"]').forEach((v)=>v.checked && (Options.variant = v.value));
	['example', 'compact', 'avr'].forEach((v)=>GetOptionValue(v, 'checked'));
	localStorage.setItem('Options', JSON.stringify(Options));
}
function HashChanged() {
	var a = document.querySelector('#options-button');
	a && (a.href = location.hash === '#options' ? '#' : '#options');
	if( ! CheckTerms() ) return;
	if( location.hash === '#options' ) {
		SetOptions();
	} else {
		GetOptions();
	}
}
var ChangeTimeout = null;
function Store() {
	try {
		localStorage.setItem('JSON',Json.session.getValue());
	} catch(e) {
		console.warn(e.message);								
	}
}		
function GetTermsDate() {
	var date = document.querySelector('#terms-date');
	return (date && date.innerHTML) || new Date().toISOString().split('T')[0];			
}
function TermsAccepted() {
	var date = GetTermsDate();
	var accepted = localStorage.getItem('terms-accepted');
	return accepted === date;
}	
function CheckTerms() {
	if( TermsAccepted() ) return true;
	location.hash = '#terms';
	return false;
}
function OnTermsAccepted() {
	if( this.checked ) {
		localStorage.setItem('terms-accepted',GetTermsDate());
		location.hash = '#';
	} else {
		localStorage.clear();
	}			
}
function Init() {
	Object.keys(Options).forEach((v)=>BindControl(document.querySelector('#' + v)));
	document.querySelectorAll('input[name="variant"]').forEach((v)=>BindControl(v));
	window.onhashchange = HashChanged;
	var options = localStorage.getItem('Options');
	if( options ) try {
		options = JSON.parse(options);
		Object.keys(Options).forEach((v)=>v !== 'options_version' && (Options[v] = options[v]));
	} catch(e) {
		console.info(e.message);
	}
	SetOptions();
	var json_text = localStorage.getItem('JSON');
	Json.session.setValue(json_text || Sample);
	try {
		JSON.parse(Json.session.getValue());
		Run();
	} catch(e) {
		console.warn(e.message);				
	}
	Json.getSession().on('change', ()=>{ ChangeTimeout && clearTimeout(ChangeTimeout); ChangeTimeout = setTimeout(Store, 1); });
	document.querySelectorAll('#terms-accepted').forEach((v)=>{v.onchange=OnTermsAccepted; v.checked = TermsAccepted(); });
	CheckTerms();
}