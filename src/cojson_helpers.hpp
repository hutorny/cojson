/*
 * Copyright (C) 2015 Eugene Hutorny <eugene@hutorny.in.ua>
 *
 * cojson_detectors.hpp - 
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

#ifndef COJSON_HELPERS_HPP_
#define COJSON_HELPERS_HPP_
#include <type_traits>
#include <limits>
#include <stdint.h>

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
	sprintf(std::declval<C*>(),
		std::declval<const C*>(), std::declval<T>())
)>;
template<typename, typename>
static auto test_sprintf(long) -> std::false_type;
template<class T, typename C>
struct has_sprintf : decltype(test_sprintf<T,C>(0)){};

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
namespace details {
/******************************************************************************/
/* writer's helpers															  */

template<typename T>
struct numeric_helper_unsigned {
	/* U - unsigned implementation type, upsized if necessary */
	typedef typename std::conditional<(sizeof(T)<sizeof(unsigned int)),
		unsigned int, T>::type U;
	static constexpr T min = std::numeric_limits<T>::min();
	static constexpr inline bool is_negative(T) noexcept { return false; }
	static constexpr inline U abs(T v) noexcept { return v; }
};
template<typename T>
struct numeric_helper_signed {
	/* U - unsigned implementation type, upsized if necessary */
	typedef typename std::conditional<(sizeof(T)<sizeof(unsigned int)),
		unsigned int,typename std::make_unsigned<T>::type>::type U;
	static constexpr T min = std::numeric_limits<T>::min();
	static constexpr inline bool is_negative(T v) noexcept { return v < 0; }
	static constexpr inline U abs(T v) noexcept { return v >= 0 ? v : -v; }
};
template<typename T>
struct numeric_helper : std::conditional<std::is_signed<T>::value,
	numeric_helper_signed<T>, numeric_helper_unsigned<T>>::type {
	static_assert(std::is_integral<T>::value, "T is not of integral type");
	static constexpr T max = std::numeric_limits<T>::max();
	static inline constexpr T figure(unsigned long long v) noexcept  {
		return v > static_cast<unsigned long long>(max) / 10ULL ?
			static_cast<T>(v) : figure(v*10ULL);
	}
	static constexpr T pot = figure(10ULL); /** highest power of ten */
};


template<typename T>
struct digitizer {
public:
	inline digitizer(T val) noexcept : value(val), divider(pot) {}
	bool get(uint_fast8_t& digit, bool erase = false) noexcept {
		if( divider == 0 ) return false;
		digit = (value / divider) % 10;
		if( erase ) value -= digit * divider;
		divider /= 10;
		return true;
	}
	inline operator bool() const noexcept { return value != 0; }
	inline void skip(bool two) noexcept {
		divider /= two ? 100 : 10;
	}
private:
	static constexpr T pot = numeric_helper<T>::pot; /* highest power of ten */
	T value;
	T divider;
};

/**
 * helper for soft dependency on exp10
 */
template<typename T>
T exp_10(short) noexcept;

} // namespace details
} //namespace cojson
#endif //COJSON_HELPERS_HPP_




