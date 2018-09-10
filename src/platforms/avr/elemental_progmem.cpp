/*
 * Copyright (C) 2015-2018 Eugene Hutorny <eugene@hutorny.in.ua>
 *
 * cojson_progmem.cpp - progmem storage for string literals and progmem access
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

/*
 * This file provides implementation progmem methods and placements for
 * promem literals
 */
#include <avr/pgmspace.h>
#include "elemental.hpp"
namespace elemental {
template<>
unsigned char progmem<unsigned char>::read(const unsigned char * ptr) noexcept {
	return pgm_read_byte(ptr);
}
template<>
char progmem<char>::read(const char * ptr) noexcept {
	return pgm_read_byte(ptr);
}
template<>
progmem<char> progmem<progmem<char>>::read(const progmem<char>* ptr) {
	static_assert(sizeof(progmem<char>)==2,"Unexpected data size");
	return progmem<char>(
		reinterpret_cast<const char*>(pgm_read_word_near(ptr)));
}

}
