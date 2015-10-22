/*
 * Copyright (C) 2015 Eugene Hutorny <eugene@hutorny.in.ua>
 *
 * mcu-env.hpp - cojson tests, framework definition specific for MCU platforms
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

#ifndef TOOLS_MCU_ENV_HPP_
#define TOOLS_MCU_ENV_HPP_
#include "common.hpp"

using namespace std;

namespace cojson {
	namespace test {

	class McuEnvironment : public Environment {
	private:
		static bool dumped;
	public:
		McuEnvironment(buffer& out) noexcept  : Environment(out) {}
		virtual void write(char b) const noexcept  = 0;
		virtual void write(const char *str) const noexcept  = 0;
		virtual void write(const char *buffer, unsigned size) const noexcept  = 0;

		void dump(bool success) const noexcept  {
			if( noout(success, true) ) return;
			const char *b;
			if( (b=output.begin()) != nullptr ) {
				if( options.output == as_json )
					write(dumped ? ',' : '[');
				write(b,output.count() - (output.size() == 0 ? 0 : 1));
				write("\n");
				dumped = true;
			}
		}
		virtual void end() const noexcept  {
			if( options.output == as_json && dumped )
				write(']');
			dumped = false;
		}

		inline bool noout(bool success, bool json) const noexcept  {
			return
				options.output == nothing ||
				(options.output == as_json && ! (json && success) )||
				(options.output == positive && ! success) ||
				(options.output == negative && success);
		}

		void next() const noexcept {
			Environment::next();
			output.restart();
		}
	};

	bool McuEnvironment::dumped = false;


}
}


#endif /* TOOLS_HOST_HPP_ */
