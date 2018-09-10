/*
 * Copyright (C) 2015, 2017 Eugene Hutorny <eugene@hutorny.in.ua>
 *
 * json_via_std_stream.cpp - example for using cojson with std streams
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
 * You should have received a copy of the GNU General Public License
 * along with the COJSON Library; if not, see
 * <http://www.gnu.org/licenses/gpl-2.0.html>.
 */

#include <iostream>
#include <cojson_wrappers.hpp>

using namespace cojson;
using namespace std;

struct led {
	static bool val;
	static bool get() noexcept {
		return val;
	}
	static void set(bool v) noexcept {
		val = v;
	}

	static constexpr const char* name() noexcept { return "led"; }
	static const details::value& json() noexcept {
		return V<M<led::name,accessor::functions<bool, led::get,led::set>>>();
	}
};

bool led::val = false;

void json_read_write() {
	cojson::wrapper::istream<std::istream> in(cin);
	cojson::wrapper::ostream<std::ostream> out(cout);
	led::json().read(in);
	led::json().write(out);
}

