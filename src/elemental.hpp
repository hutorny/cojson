/*
 * Copyright (C) 2017-2018 Eugene Hutorny <eugene@hutorny.in.ua>
 *
 * elemental.hpp - COJSON and µcuREST elemental definitions
 *
 * This file is part of COJSON Library. http://hutorny.in.ua/projects/cojson
 * This file is part of µcuREST Library. http://hutorny.in.ua/projects/micurest
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
#pragma once

#include <configuration.h>
#include <elemental.ccs>
#include <type_traits>

namespace elemental {

typedef unsigned size_t;

template<typename T>
class progmem {
public:
	explicit inline constexpr progmem(const T* str) noexcept : ptr(str) {}
	explicit inline constexpr operator const T*() noexcept { return ptr; }
	inline T operator*() const noexcept { return read(ptr); }
	inline T operator[](unsigned i) const noexcept { return read(ptr+i); }
	inline progmem operator++(int) noexcept { return progmem(ptr++); }
	inline constexpr progmem operator+(unsigned off) const noexcept {
		return progmem(ptr+off);
	}
	inline constexpr bool operator !=(std::nullptr_t) const noexcept {
		return ptr != nullptr;
	}
	inline constexpr bool operator !=(progmem that) const noexcept {
		return ptr != that.ptr;
	}
	inline constexpr bool operator ==(std::nullptr_t) const noexcept {
		return ptr == nullptr;
	}
	inline progmem& operator++() noexcept { ++ptr; return *this; }
private:
	static T read(const T *ptr) noexcept;
	const T *ptr;
};

struct config : configuration::Configuration<config> {};

typedef std::conditional<config::cstring == config::cstring_is::avr_progmem,
		progmem<char>, const config::char_t*>::type cstring;

/**
 * Constexpr division with rounding up
 */
template<typename N, typename D>
inline constexpr N div(N numer, D divisor) noexcept {
	return (numer+divisor-1)/divisor;
}

/**
 * name type - a function returning pointer to a name
 */
typedef cstring (*name)();

template<unsigned bytes> struct uintN_bytes;
template<> struct uintN_bytes<0> { typedef unsigned char  type; };
template<> struct uintN_bytes<1> { typedef unsigned char  type; };
template<> struct uintN_bytes<2> { typedef unsigned short type; };
template<> struct uintN_bytes<3> { typedef unsigned long  type; };
template<> struct uintN_bytes<4> { typedef unsigned long  type; };
template<> struct uintN_bytes<5> { typedef unsigned long long type; };
template<> struct uintN_bytes<6> { typedef unsigned long long type; };
template<> struct uintN_bytes<7> { typedef unsigned long long type; };
template<> struct uintN_bytes<8> { typedef unsigned long long type; };

template<unsigned N> struct uintN_t : uintN_bytes<div(N,8)> {};

template<unsigned long long V>
struct log2 { static constexpr unsigned char value = log2<V/2>::value + 1; };

template<> struct log2<2LL> { static constexpr unsigned char value = 1; };
template<> struct log2<1LL> { static constexpr unsigned char value = 0; };
template<> struct log2<0LL> { static constexpr unsigned char value = 0; };

/** returns member-array extent												*/
template<class C, typename T, size_t N>
static inline constexpr size_t countof(T (C::*)[N]) noexcept { return N; }

/** returns array extent													*/
template<typename T, size_t N>
static inline constexpr size_t countof(T (&)[N]) noexcept  { return N; }


/** bit mask of N bits														*/
template<unsigned N>
class bitset {
public:
	inline void set(unsigned char bit) noexcept { bits |= (1<<bit); }
	inline void clr(unsigned char bit) noexcept { bits &= ~(1<<bit); }
	inline constexpr bool
	has(unsigned char bit) const noexcept { return bits & (1<<bit); }
	inline constexpr operator bool() const noexcept { return bits; }
private:
	typename elemental::uintN_t<N>::type bits;
};


/** bit mask of listed values L...											*/
template <typename T, T ... L>
struct mask;

template <typename T>
struct mask<T> {
	static constexpr unsigned char value = 0;
	static constexpr bool has(T) noexcept { return false; }
};

template <typename T, T I>
struct mask<T, I> {
	static constexpr T max = I;
	static constexpr typename elemental::uintN_t<+max>::type value = (1<<+I);
	static constexpr bool has(T v) noexcept { return v == I; }
};

/** bit mask of N values													*/
template <typename T, T I, T ... L>
struct mask<T, I, L...> {
	static constexpr T max = I > mask<T,L...>::max ? I : mask<T,L...>::max;
	static constexpr typename elemental::uintN_t<+max>::type value =
		(1<<+I) | mask<T,L...>::value;
	static constexpr bool has(T v) noexcept { return (1<<+v) & value; }
};

template<typename A, typename B>
constexpr bool equal(A a, B b) noexcept;

/** set of named types														*/
template <typename ... L>
struct set;

template <typename T>
struct set<T> {
	static constexpr unsigned char count = 1;
	static constexpr unsigned char pos   = 0;
	typedef typename elemental::uintN_t<count>::type mask_t;
	static constexpr mask_t mask = (1<<pos);
	template<typename ... S>
	struct subset;
	template<typename S>
	struct subset<S> {
		static constexpr mask_t value =
			std::is_base_of<T,S>::value ? mask : 0;

	};
	template<typename S, typename ... O>
	struct subset<S,O...> {
		static constexpr mask_t value =
			subset<O...>::value |
			(std::is_base_of<T,S>::value ? mask : 0);

	};
	static inline constexpr mask_t find(const char* name) noexcept {
		return equal(T::name, name) ? mask : 0;
	}
	static inline constexpr name get(unsigned char m) noexcept {
		return m == pos ? T::name : nullptr;
	}
};

template <typename T, typename ... L>
struct set<T, L...> {
	static constexpr unsigned char count = 1 + sizeof...(L);
	static constexpr unsigned char pos   = sizeof...(L);
	typedef typename elemental::uintN_t<count>::type mask_t;
	static constexpr mask_t mask = (1<<pos);
	template<typename ... S>
	struct subset;
	template<typename S>
	struct subset<S> {
		static constexpr mask_t value =
			set<L...>::template subset<S>::value |
			(std::is_base_of<T,S>::value ? mask : 0);

	};
	template<typename S, typename ... O>
	struct subset<S,O...> {
		static constexpr mask_t value =
			set<L...>::template subset<S,O...>::value |
			(std::is_base_of<T,S>::value ? mask : 0);

	};
	static inline constexpr mask_t find(const char* name) noexcept {
		return equal(T::name, name) ? mask : set<L...>::find(name);
	}
	static inline constexpr name get(unsigned char m) noexcept {
		return m == pos ? T::name : set<L...>::get(m);
	}
};

inline constexpr unsigned cstrlen(const char* s) noexcept {
   return *s ? 1+cstrlen(s+1) : 0;
}

template<typename A, typename B>
bool match(A a, B b) noexcept;

template<>
bool match<const char *, const char*>(const char *, const char*) noexcept;

template<>
bool match<const wchar_t*, const wchar_t*>(
		   const wchar_t*, const wchar_t*) noexcept;
template<>
bool match<const char16_t*, const char16_t*>(
		   const char16_t*, const char16_t*) noexcept;
template<>
bool match<const char32_t*, const char32_t*>(
		   const char32_t*, const char32_t*) noexcept;

template<>
inline bool match<char const*, char*>(char const* a, char* b) noexcept {
	return match<char const*, const char*>(a,b);
}

template<>
bool match<progmem<char>, char const*>(progmem<char> a, char const* b) noexcept;

template<>
inline bool match<progmem<char>,char*>(progmem<char> a, char* b) noexcept {
	return match<progmem<char>, char const*>(a,b);
}

}
