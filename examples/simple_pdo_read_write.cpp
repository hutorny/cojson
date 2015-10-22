/*
 * Copyright (C) 2015 Eugene Hutorny <eugene@hutorny.in.ua>
 *
 * simple_pdo_read_write.cpp - simple example with PDO read/write
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
using namespace cojson;

#define NAME(s) static inline constexpr const char* s() noexcept { return #s; }
struct Pdo {
	struct Name {
		NAME(u)
		NAME(s)
		NAME(v)
	};
	char s[16];
	short u;
	short v;
	// JSON structure definition
	static const details::clas<Pdo>& structure() {
		return
			O<Pdo,
				P<Pdo, Name::s, details::countof(&Pdo::s), &Pdo::s>,
				P<Pdo, Name::u, decltype(Pdo::u), &Pdo::u>,
				P<Pdo, Name::v, decltype(Pdo::v), &Pdo::v>
	>();
	}
	// reading JSON
	inline bool read(details::lexer& in) {
		return structure().read(*this,in);
	}
	// writing JSON
	inline bool write(details::ostream& out) {
		return structure().write(*this,out);
	}
};



