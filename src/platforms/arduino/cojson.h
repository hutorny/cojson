/*
 * Copyright (C) 2018 Eugene Hutorny <eugene@hutorny.in.ua>
 *
 * cojson.h - the primary include for Arduino platform
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
 * along with the µcuREST Library; if not, see
 * <http://www.gnu.org/licenses/gpl-2.0.html>.
 */

/* Cleaning up after Arduino 												*/
#pragma once
#ifdef abs
#	pragma push_macro("abs")
#	undef abs
#endif
#ifdef bit
#	pragma push_macro("bit")
#	undef bit
#endif
#ifdef F
#	pragma push_macro("F")
#	undef F
#endif
#ifdef boolean
#	pragma push_macro("boolean")
#	undef boolean
#endif
#ifdef ctype
#	pragma push_macro("ctype")
#	undef ctype
#endif
#ifdef min
#	pragma push_macro("min")
#	undef min
#endif
#ifdef max
#	pragma push_macro("max")
#	undef max
#endif
#include "cojson.hpp"
/* Putting that back 														*/
#pragma pop_macro("max")
#pragma pop_macro("min")
#pragma pop_macro("ctype")
#pragma pop_macro("boolean")
#pragma pop_macro("F")
#pragma pop_macro("bit")
#pragma pop_macro("abs")

namespace cojson {
#ifdef __AVR__
using cojson::details::progmem;
#endif
namespace wrapper {

template<class Stream>
class iostream : details::istream,
	public details::ostream, public details::lexer {
private:
	Stream& io;
	bool get(char_t& c) noexcept {
		while( ! io.available() ) ;
		int r = io.read();
		if( r == -1 ) {
			istream::error(details::error_t::eof);
			c = iostate::eos_c;
			return false;
		}
		c = static_cast<char_t>(r);
		if( echo_ ) io.write(c);
		return true;
	}
	bool put(char_t c) noexcept {
		while( ! io.availableForWrite() );
		return io.write(c) == 1;
	}
	bool echo_;
public:
	using lexer::error;
	inline lexer& in() { return * this; }
	inline details::ostream& out() { return * this; }
	inline iostream(Stream& stream) noexcept
	  :	lexer(static_cast<istream&>(*this)), io(stream), echo_(false) {}
	/** enables local echo on the stream 									*/
	inline void echo(bool on) noexcept { echo_ = on; }
	/** clears error condition												*/
	void clear() {
		istream::clear();
		ostream::clear();
		lexer::restart();
	}
};
}

}
/*
 * Macro for literal definitions
 */
#ifdef __AVR__
#	define NAME(s) static inline cojson::cstring s() 	noexcept { 			\
		static const char l[] __attribute__((progmem)) = #s; 				\
		return cojson::cstring(l);}
#	define ALIAS(f,s) static inline cojson::cstring f() noexcept {			\
		static const char l[] __attribute__((progmem)) = #s; 				\
		return cojson::cstring(l); }
#	define ENUM(s) constexpr const char* s() 			noexcept { return #s; }
#else
#	define NAME(s) static inline cojson::cstring s() 	noexcept { return #s; }
#	define ALIAS(f,s) static inline cojson::cstring f() noexcept { return #s; }
#	define ENUM(s) constexpr const char* s() 			noexcept { return #s; }
#endif
