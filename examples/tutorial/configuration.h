#pragma once

/* I.   Place a copy of this file on the include path
 * II.  REMOVE options to be left at default state
 * III. Adjust options as needed
 * IV.  Change selector from Default to User or any other used here
 * V.   Multiple configurations can be kept in one file and switched by
 * 		the selector
 */

#include "cojson.ccs"

namespace configuration {
namespace build { struct User;	}

struct Current : Is<target::All,build::Default> {};//User configuration is NOT active
//struct Current : Is<target::AVR,build::User> {}; //User configuration is ACTIVE

template<> struct Selector<cojson::config> : Current {};
template<> struct Selector<cojson::details::lexer> : Current {};

//
// Configuration symbols in cojson configuration
// Symbol 		| Values		| When specified...
// -------------+---------------+-----------------------------------------------
// overflow 	| saturate		| numbers are saturated on overflow
// 				| error			| overflow causes an error
// 				| ignore		| overflow condition silently ignored
// -------------+---------------+-----------------------------------------------
// mismatch		| skip			| reader makes best efforts to skip such values
// 				| error			| any mismatch in size or data type
// 				|			  	| is treated as an error
// -------------+---------------+-----------------------------------------------
// null			| skip			| skip nulls by default
// 				| error			| default handling for null is an error
// -------------+---------------+-----------------------------------------------
// iostate		| _notvirtual	| stream's error method are not virtual
// 				| _virtual		| stream's error method are virtual,
// 				|				| needed if a class implements both
// 				|				| cojson::istream and cojson::ostream
// -------------+---------------+-----------------------------------------------
// temporary	| _static		| temporary buffer is implemented static
// 				| _automatic	| temporary buffer is implemented automatic
// -------------+---------------+-----------------------------------------------
// temporary_size				| overrides temporary buffer size
// -------------+---------------+-----------------------------------------------
//

template<>
struct Configuration<cojson::config, target::All, build::User>
	:  Configuration<cojson::config, target::All, build::Default> {
	// use of wchar_t
	typedef wchar_t char_t;

	// controls behavior on integral overflow
	static constexpr auto overflow 	= overflow_is::error;

	// controls implementation of iostate::error
	static constexpr auto iostate   = iostate_is::_virtual;

	// controls default null handling
	static constexpr auto null = null_is::error;

	// controls size of temporary buffer
	static constexpr unsigned sprintf_buffer_size = 32;
};

template<>
struct Configuration<cojson::details::lexer, target::All, build::User>
  :    Configuration<cojson::details::lexer, target::All, build::Default> {

	// controls behavior on read element mismatching target data type
	static constexpr auto mismatch = cojson::default_config::mismatch_is::error;

	// controls size of lexer's temporary buffer
	static constexpr unsigned temporary_size = 32;

	// sets maximal length of a JSON key length
	static constexpr unsigned max_key_length = 128;
};
}
// */
