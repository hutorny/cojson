/*
 * Copyright (C) 2015-2018 Eugene Hutorny <eugene@hutorny.in.ua>
 *
 * nameof.hpp - automatic name generation
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
 * along with the COJSON Library; if not, see
 * <http://www.gnu.org/licenses/gpl-2.0.html>.
 */
#pragma once

#if __cplusplus < 201703L
#   error This file should be compiled with a c++17 capable compiler
#endif
#if !defined(__clang__) &&  !( defined(__GNUC__) && __GNUC__ >= 7)
#	error Unsupported compiler
#endif

#include <string_view>
#include <utility>

namespace nameOf {
namespace details {
#	if defined(__clang__)
	enum anchor : char {
		space		= ' ',
		colon		= ':',
		end			= ']',
		amp			= '&',
		rpar		= ')',
	};
#	elif defined(__GNUC__)
	enum anchor : char {
		space		= ' ',
		colon		= ':',
		end			= ';',
		amp			= '&',
		rpar		= ')',
	};
#	endif

	template<auto V>
	constexpr std::string_view n() {
		constexpr std::string_view pretty = __PRETTY_FUNCTION__;
	    return  pretty;
	}
	constexpr std::size_t findbegin(const std::string_view s, std::size_t rpos) {
		return std::max(
				s.rfind(anchor::colon, rpos),
				s.rfind(anchor::space, rpos))+1;
	}
	constexpr std::size_t findend(const std::string_view s) {
		return s.rfind(anchor::end) -
			(s[s.rfind(anchor::end)-1] == anchor::rpar);
	}
	template<auto V>
	constexpr std::string_view lastname() {
		constexpr auto raw = n<V>();
		constexpr auto end = findend(raw);
		constexpr auto begin = findbegin(raw, end);
		return raw.substr(begin, end - begin);
	}
}

template<auto V>
struct traits {
	static constexpr auto value = details::lastname<V>();
	static constexpr auto length = value.size();
};

template<typename CharT, std::size_t Size>
struct basic_cestring {
	using value_type = CharT;
	static inline constexpr std::size_t size() { return Size; }
	static inline constexpr std::size_t length() { return Size; }
	static inline constexpr std::size_t capacity() { return Size; }
	static inline constexpr bool empty() { return false; }
	template<std::size_t... I> constexpr
	basic_cestring(const std::string_view& view, std::index_sequence<I...>)
	  : _data{view[I]...} {}
	template<std::size_t... I> constexpr
	basic_cestring(const CharT* str, std::index_sequence<I...>)
	  : _data{str[I]...} {}
	const CharT* data() const { return _data; }
	const CharT _data[Size + 1];
};


template<std::size_t Size>
struct cestring : public basic_cestring<char, Size>  {
	using index = std::make_index_sequence<Size>;
	constexpr cestring(const std::string_view& view) : basic_cestring<char, Size>(view, index{}) {}
	constexpr cestring(const char* str) : basic_cestring<char, Size>(str, index{}) {}
};


template<auto F>
static constexpr cestring<traits<F>::length> nameof() {
	constexpr cestring<traits<F>::length> name = { traits<F>::value.data() };
	return name;
}

}
