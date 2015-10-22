/*
 * Copyright (C) 2015 Eugene Hutorny <eugene@hutorny.in.ua>
 *
 * host.hpp - cojson tests, framework definition specific for host platform
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

#ifndef TOOLS_HOST_ENV_HPP_
#define TOOLS_HOST_ENV_HPP_
#include <cstdio>
#include <cstring>
#include <cstdarg>
#include <cerrno>
#include <cstdlib>
#include <chrono>
#include "common.hpp"
#include "coop.hpp"

using namespace std;

namespace cojson {
	namespace test {
	static auto start = std::chrono::high_resolution_clock::now();

	template<typename T = char_t>
	struct literals;

	template<>
	struct literals<char> {
		static constexpr const char* value_separator = ",";
		static constexpr const char* begin_array 	 = "[";
		static constexpr const char* end_array 		 = "]";
		static constexpr const char* lf 		 	 = "\n";
		static constexpr const char* cstring		 = "\"";
	};

	template<>
	struct literals<wchar_t> {
		static constexpr const wchar_t* value_separator	= L",";
		static constexpr const wchar_t* begin_array		= L"[";
		static constexpr const wchar_t* end_array		= L"]";
		static constexpr const wchar_t* lf 		 	 	= L"\n";
		static constexpr const char* cstring		 	= "L\"";
	};

	template<>
	struct literals<char16_t> {
		static constexpr const char16_t* value_separator= u",";
		static constexpr const char16_t* begin_array	= u"[";
		static constexpr const char16_t* end_array		= u"]";
		static constexpr const char16_t* lf 		 	= u"\n";
		static constexpr const char* cstring		 	= "u\"";
	};
	template<>
	struct literals<char32_t> {
		static constexpr const char32_t* value_separator= U",";
		static constexpr const char32_t* begin_array	= U"[";
		static constexpr const char32_t* end_array		= U"]";
		static constexpr const char32_t* lf 		 	= U"\n";
		static constexpr const char* cstring		 	= "U\"";
	};

	class HostEnvironment : public Environment {
	private:
		//mutable std::chrono::steady_clock::time_point start;

		void startclock() const noexcept {
			start = std::chrono::high_resolution_clock::now();
		}

		long elapsed() const noexcept {
			return
				std::chrono::duration_cast<std::chrono::microseconds>(
					std::chrono::high_resolution_clock::now() - start
				).count();
		}

		template<typename T>
		bool put(T chr, FILE* out) const noexcept;

		/** returns 0 on success */
		static int escape(char_t chr, FILE* out) {
			if( chr >= ' ' && chr != '"' && chr != '\\' )
				return fputc(chr, out) == EOF;
			if( fputc('\\', out) == EOF ) return !0;
			char c = '0' + ((chr>>6) & 7);
			bool oct = false;
			switch(chr) {
			case '\\': c = '\\'; break;
			case '"' : c = '"';  break;
			case '\b': c = 'b';  break;
			case '\f': c = 'f';  break;
			case '\n': c = 'n';  break;
			case '\r': c = 'r';  break;
			case '\t': c = 't';  break;
			default: oct = true;
			}
			if( fputc(c, out) == EOF ) return !0;
			if( oct ) {
				return
				  !((fputc('0' + ((chr>>3) & 7), out) != EOF ) &&
					(fputc('0' + ((chr   ) & 7), out) != EOF )) ;
			}
			return 0;
		}

		static bool dumped;
	public:
		HostEnvironment(buffer& out) : Environment(out) {}
		/** match output with the given master  */
		int match(master_t data) const noexcept {
			return data.data ? ! memcmp(
				output.begin(), data.data, output.count()*sizeof(char_t))
				: !0;
		}
		inline void dlm(bool end = false) const noexcept {
			const char_t* b = end
				? literals<>::end_array
				: dumped ? literals<>::value_separator
				: literals<>::begin_array;
			fwrite(b,1,sizeof(char_t),stdout);
		}

		void dump(bool success) const noexcept {
			if( noout(success, true) ) return;
			const char_t *b;
			if( (b=output.begin()) != nullptr && *b ) {
				if( options.output == as_json ) dlm();
				size_t count = output.count() - (output.size() == 0 ? 0 : 1);
				fwrite(b, count, sizeof(char_t), stdout);
				fwrite(literals<>::lf, 1, sizeof(char_t), stdout);
				fflush(stdout);
				dumped = true;
			}
		}
		virtual void end() const noexcept {
			if( options.output == as_json && dumped )
				dlm(true);
			dumped = false;
		}

		virtual void msg(verbosity lvl, master_t master) const noexcept {
			if( lvl > options.level ) return;
			fprintf(stderr, fmt<const char_t*>(), master.data);
		}


		void msg(verbosity lvl, const char *fmt, ...) const noexcept {
			if( lvl > options.level ) return;
			va_list args;
			va_start(args, fmt);
			vfprintf(stderr, fmt, args);
			va_end(args);
		}

		void out(bool success, const char *fmt, ...) const noexcept {
			if( noout(success, false) ) return;
			va_list args;
			va_start(args, fmt);
			vfprintf(stdout, fmt, args);
			va_end(args);
		}

		inline bool noout(bool success, bool json) const {
			return
				options.output == nothing ||
				(options.output == as_json && ! (json && success) )||
				(options.output == positive && ! success) ||
				(options.output == negative && success);
		}

		const char* shortname(const char* filename) const noexcept {
			const char* r;
			return ((r=strrchr(filename,'/'))) ? ++r : filename;
		}

		void mastername(const char* filename, char * dst) const noexcept {
			//TODO use destination folder
			//TODO skip relative part
			if( (*filename=='.') && (*++filename=='.') && (*++filename=='/') )
				++filename;
			char* r;
			strcpy(dst, filename);
			if( (r = strrchr(dst,'.')) )
				strcpy(r,".inc");
			else
				strcat(dst,".inc");
		}

		void master(const char* file, int index) const noexcept;

		void next() const noexcept {
			Environment::next();
			output.restart();
		}
	};

	class DefaultEnvironment : public HostEnvironment {
	public:
		typedef HostEnvironment base;
		DefaultEnvironment(buffer& out) : HostEnvironment(out) {}
		void next() const noexcept;
		void setbuffsize(unsigned) const noexcept;
		void resetbuffsize() const noexcept;
	};

	template<>
	inline bool HostEnvironment::put<char>(char chr, FILE* out) const noexcept {
		return escape(chr,out);
	}

	template<>
	bool HostEnvironment::put<wchar_t>(wchar_t chr, FILE* out) const noexcept;
	template<>
	bool HostEnvironment::put<char16_t>(char16_t chr, FILE* out) const noexcept;
}}



#endif /* TOOLS_HOST_ENV_HPP_ */
