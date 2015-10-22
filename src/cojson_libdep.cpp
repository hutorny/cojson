/*
 * Copyright (C) 2015 Eugene Hutorny <eugene@hutorny.in.ua>
 *
 * cojson_libdep.cpp - methods' implementations with soft dependencies on libs
 *
 * This file is part of COJSON Library. http://hutorny.in.ua/projects/cojson
 *
 * The COJSON Library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public License v2
 * as published by the Free Software Foundation;
 *
 * The COJSON Library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with the COJSON Library; if not, see
 * <http://www.gnu.org/licenses/gpl-2.0.html>.
 */

#include "cojson.hpp"
/* any of the includes below could be replaced with an empty stub 			*/
#include <stdio.h>
#include <string.h>
#include <math.h>
#include <wchar.h>

namespace cojson {
namespace detectors {
/****************************************************************************
 *				  presence detector for dependent features					*
 ****************************************************************************/
template<class>
struct sfinae_true : std::true_type{};

/* snprintf */
template<typename T, typename C>
static auto test_snprintf(int) -> sfinae_true<decltype(
	snprintf(std::declval<C*>(), 0,
		std::declval<const C*>(), std::declval<T>())
)>;
template<typename, typename>
static auto test_snprintf(long) -> std::false_type;
template<class T, typename C>
struct has_snprintf : decltype(test_snprintf<T,C>(0)){};

/* sprintf */
template<typename T, typename C>
static auto test_sprintf(int) -> sfinae_true<decltype(
	sprintf(std::declval<C*>(), 0,
		std::declval<const C*>(), std::declval<T>())
)>;
template<typename, typename>
static auto test_sprintf(long) -> std::false_type;
template<class T, typename C>
struct has_sprintf : decltype(test_snprintf<T,C>(0)){};

/* swprintf */
template<typename T, typename C>
static auto test_swprintf(int) -> sfinae_true<decltype(
			swprintf(std::declval<C*>(), 0,
				std::declval<const C*>(), std::declval<T>())
)>;
template<typename, typename>
static auto test_swprintf(long) -> std::false_type;
template<class T, typename C>
struct has_swprintf : decltype(test_swprintf<T,C>(0)){};

/* exp10 */

template<typename T>
static auto test_exp10(int) -> sfinae_true<decltype(
	exp10(std::declval<T>())
)>;

template<typename>
static auto test_exp10(long) -> std::false_type;

template<class T>
struct has_exp10 : decltype(test_exp10<T>(0)){};

template<typename T>
static auto test_strcmp(int) -> sfinae_true<decltype(
	strcmp(std::declval<T>(),std::declval<T>())
)>;

template<typename>
static auto test_strcmp(long) -> std::false_type;

template<typename T>
struct has_strcmp : decltype(test_strcmp<T>(0)){};

}
using namespace detectors;

namespace details {

template<typename T, bool has = has_strcmp<T>::value>
struct string_helper {
	static inline bool match(T a, T b) noexcept {
		while( *a && *b && *a == *b ) { ++a; ++b; }
		return *a == *b;
	}
};

template<typename T>
struct string_helper<T,true> {
	static inline bool match(T a, T b) noexcept {
		return strcmp(a, b) == 0;
	}
};

template<typename C, typename T,
	bool hasswprintf = has_swprintf<T,C>::value,
	bool hassnprintf = has_snprintf<T,C>::value,
	bool hassprintf = has_sprintf<T,C>::value
	>
struct any_printf  {
	static constexpr bool present = hasswprintf || hassnprintf || hassprintf;
	/* no version of printf available */
	static int gfmt(C* dst, size_t s, T val) noexcept;
};

template<typename T, bool a, bool b>
struct any_printf<wchar_t, T, true, a, b> {
	static constexpr bool present = true;
	static inline int gfmt(wchar_t* dst, size_t s, T val) noexcept {
		return swprintf(dst, s, L"%g", val);
	}
};
template<typename T, bool a>
struct any_printf<char, T, false, true, a> {
	static constexpr bool present = true;
	static inline int gfmt(char* dst, size_t s, T val) noexcept {
		return snprintf(dst, s, "%g", val);
	}
};
template<typename T>
struct any_printf<char, T, false, false, true> {
	static constexpr bool present = true;
	static inline int gfmt(char* dst, size_t s, T val) noexcept {
		return sprintf(dst, "%g", val);
	}
};

template<typename C,
	bool=any_printf<C, double>::present,
	bool=any_printf<char, double>::present>
struct any {
	static inline bool gfmt(C* dst, size_t size, double val) noexcept {
		int r = any_printf<C,double>::gfmt(dst, size, val);
		return r >= 0 && r < (int)size;
	}
};

template<typename C>
struct any<C,false,true> {
	static inline bool gfmt(C* dst, size_t size, double val) noexcept {
		char* tmp = reinterpret_cast<char*>(dst);
		int r = any_printf<char,double>::gfmt(tmp, size, val);
		if( r < 0 && r >= (int)size ) return false;
		dst[r] = 0;
		while( r-- ) dst[r] = tmp[r];
		return true;
	}
};


template<typename T, bool has = has_exp10<T>::value>
struct exp10_helper {
	static inline T calc(short n) noexcept {
		T v = 1.;
		while( n > 0 ) { v *= 10.; --n; }
		while( n < 0 ) { v /= 10.; ++n; }
		return v;
	}
};

template<typename T>
struct exp10_helper<T,true> {
	static inline T calc(short n) noexcept {
		static_assert(has_exp10<T>::value,"No");
		return exp10((T)n);
	}
};

template<>
double exp_10<double>(short n) noexcept {
	return exp10_helper<double>::calc(n);
}

template<>
float exp_10<float>(short n) noexcept {
	return exp10_helper<float>::calc(n);
}


bool member::match(const char_t* a, const char_t* b) noexcept {
	return string_helper<const char_t*>::match(a,b);
}

template<>
bool gfmt<char_t*, double>(char_t* buf, size_t size, double val) noexcept {
	return any<char_t>::gfmt(buf, size, val);
}


}}


