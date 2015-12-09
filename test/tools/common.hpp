/*
 * Copyright (C) 2015 Eugene Hutorny <eugene@hutorny.in.ua>
 *
 * common.hpp - cojson tests, test framework definitions
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

/*
 *                        Test framework for cojson
 *
 * Concepts:
 * 1. Build entire test suite as one executable and run all tests from the
 *    suite (batch execution of multiple executables may not be feasible on
 *    some bare-metal platforms)
 * 2. Have an option for breaking test set on subsets if executable does not
 *    fit constraints of the target platform, or skipping some tests
 * 3. Generate output on a host platform for visual inspection and tooled
 *    validation
 * 4. Convert test output to a C-compilable file for embedding in the test
 *    suite
 * 5. Have an option for verbosity control:
 *       - silent:  suite status   PASS/FAIL,
 *       - normal:  tests statuses PASS/FAIL,
 *       - verbose: test output
 */

#ifndef TOOLS_COMMON_HPP_
#define TOOLS_COMMON_HPP_
#include "cojson.hpp"

namespace cojson {
	namespace test {
	using namespace details;
	/* combination of input errors (bits 0..7) and output errors (8..15) */
	enum result_t : unsigned {
		success 	=  0,
		bad			= static_cast<unsigned short>(error_t::bad) << 8,
		mismatch	= static_cast<unsigned short>(error_t::mismatch) << 8
	};

	static inline constexpr result_t combinu(
			unsigned pass,
			error_t i = error_t::noerror,
			error_t o = error_t::noerror) noexcept {
		return static_cast<result_t>(
			pass | (((unsigned)o & ~(unsigned)error_t::eof ) << 8) |
					((unsigned)i & ~(unsigned)error_t::eof ));
	}
	static inline constexpr result_t combine1(bool pass,
			error_t i = error_t::noerror,
			error_t o = error_t::noerror) noexcept {
		return combinu(pass?success:bad, i,o);
	}
	static inline constexpr result_t combine2(bool pass, bool match,
			error_t i = error_t::noerror,
			error_t o = error_t::noerror) noexcept {
		return combinu((pass?success:bad) | (match?success:mismatch), i,o);
	}

	/**
	 * On avr master data take too much RAM,
	 * Placing data in progmem requires different access methods
	 * This wrapper encapsulates master data
	 */
	struct master_t {
		const void* data;
		constexpr unsigned long farptr() const noexcept {
			return reinterpret_cast<unsigned long>(data);
		}
		template<typename T>
		T get(unsigned n);
	};

	/**
	 * This class provides numeric identities for
	 * progmem strings
	 */
	template<unsigned N>
	struct pstring {
		static const char_t str[];
	};


	class Environment {
	public:
		enum verbosity {
			silent, normal, verbose, debug
		};

		enum dumping {
			nothing,	// nothing
			as_json, 	// only positive output, format as json
			positive, 	// only positive output, as is
			all,		// all output, including negative
			negative	// only negative output
		};

		Environment(buffer& out) noexcept
		  : output(out), options {normal, false, false, nothing, -1, 0 } {}
		virtual void dump(bool) const noexcept {}
		virtual void begin() const noexcept {}
		virtual void next() const noexcept {}
		virtual void end() const noexcept {}
		/** save master for a given file and test 	*/
		virtual void master(const char*, int) const noexcept {}
		/** match output with the given master  	*/
		virtual int match(master_t) const noexcept = 0;
		/* prints a message to stderr 				*/
		virtual void msg(verbosity lvl, const char *fmt, ...) const noexcept
				__attribute__ ((format (printf, 3, 4))) = 0;
		virtual void msg(verbosity lvl, master_t) const noexcept = 0;
		/* prints test result per success and dumping settings 	*/
		virtual void out(bool success, const char *fmt, ...) const noexcept
				__attribute__ ((format (printf, 3, 4))) = 0;
		virtual const char* shortname(const char* filename) const noexcept {
			return filename;
		}
		virtual void startclock() const noexcept = 0;
		virtual long elapsed() const noexcept = 0;
		virtual void setbuffsize(unsigned) const noexcept = 0;
		virtual void resetbuffsize() const noexcept = 0;

		inline error_t error() const noexcept {
			return output.error();// & ~ error_t::eof;
		}

		inline int getsingle() const noexcept { return options.single; }
		inline int getloopcount() const noexcept { return options.loopcount; }
		inline bool isbenchmark() const noexcept { return options.loopcount > 0; }
		inline void makemasters(bool v) noexcept { options.make_masters = v; }
		inline void setsingle(int t) noexcept {
			options.single = t;
		}
		inline void setbenchmark(int v) noexcept {
			options.loopcount = v;
		}
		inline void setverbose(verbosity lvl) noexcept {
			options.level = lvl;
		}
		inline verbosity getverbose() const noexcept {
			return options.level;
		}
		inline void setoutlvl(dumping lvl) noexcept {
			options.output = lvl;
		}
		inline void stoponfail(bool v) noexcept {
			options.stoponfail = v;
		}
		inline bool stoponfail() const noexcept {
			return options.stoponfail;
		}
		buffer& output;
		static Environment& instance() noexcept;
		inline bool noout(bool success, bool json) const {
			return
				options.output == nothing ||
				(options.output == as_json && ! (json && success) )||
				(options.output == positive && ! success) ||
				(options.output == negative && success);
		}
	protected:
		struct {
			verbosity level;
			bool make_masters;
			bool stoponfail;
			dumping output;
			int single;
			int loopcount;
		} options;
		virtual ~Environment() noexcept {}
	private:
		Environment(const Environment&);
		Environment& operator=(const Environment&);
	};

	class Test {
	public:
		typedef result_t (* runner)(const Environment&);
		inline Test(const char * fname, const char * descript, runner func)
			noexcept : filename(fname), description(descript), run(func) {
			add(this);
		}
		const char* const filename;
		const char* const description;
		runner const run;
		static int runall(const Environment&) noexcept;
		static int benchmark(const Environment&) noexcept;
		static unsigned count() noexcept;
		virtual int index() const noexcept { return 0; }
		virtual const master_t master() const noexcept { return {nullptr}; }
		virtual ~Test() noexcept {}
		static inline error_t expected(error_t err, error_t exp) noexcept {
			return static_cast<error_t>(
					static_cast<unsigned char>(err)
					xor static_cast<unsigned>(exp));
		}

	protected:
		static void add(const Test*) noexcept;
	};

	using namespace details;

	template<typename T> constexpr const char * fmt() noexcept;
	template<>
	constexpr const char* fmt<bool>() noexcept { return " %d\n"; }
//	template<>
//	constexpr const char* fmt<char>() noexcept { return " %d\n"; }
	template<>
	constexpr const char* fmt<signed char>() noexcept { return " %d\n"; }
	template<>
	constexpr const char* fmt<unsigned char>() noexcept { return " %u\n"; }
	template<>
	constexpr const char* fmt<short>() noexcept { return " %d\n"; }
	template<>
	constexpr const char* fmt<int>() noexcept { return " %d\n"; }
	template<>
	constexpr const char* fmt<long>() noexcept { return " %ld\n"; }
	template<>
	constexpr const char* fmt<long long>() noexcept {return " %lld\n"; }
	template<>
	constexpr const char* fmt<unsigned short>() noexcept { return " %u\n"; }
	template<>
	constexpr const char* fmt<unsigned int>() noexcept { return " %u\n"; }
	template<>
	constexpr const char* fmt<unsigned long>() noexcept { return " %lu\n"; }
	template<>
	constexpr const char* fmt<unsigned long long>() noexcept {return " %llu\n";}
	template<>
	constexpr const char* fmt<double>() noexcept { return " %g\n"; }
	template<>
	constexpr const char* fmt<float>()  noexcept { return " %g\n"; }
	template<>
	constexpr const char* fmt<const char*>()  noexcept { return " %s\n"; }
	template<>
	constexpr const char* fmt<const wchar_t*>()  noexcept { return " %ls\n"; }
	template<> /* custom printf specifier for char16_t */
	constexpr const char* fmt<const char16_t*>()  noexcept { return " %w\n"; }
	template<> /* custom printf specifier for char32_t */
	constexpr const char* fmt<const char32_t*>()  noexcept { return " %W\n"; }

	typedef Environment::verbosity LVL;

	template<size_t N>
	class test_buffer : public buffer {
	public:
		test_buffer() noexcept : buffer(data) {}
		size_t maxsize() const noexcept {
			return N;
		}
		void setlimit(unsigned limit) noexcept {
			buffer::set(data, limit);
		}
		void resetlimit() noexcept {
			buffer::set(data, N);
		}

	private:
		char_t data[N];
	};

	template<typename T>
	inline constexpr const char* error_fmt() noexcept;
	template<>
	inline constexpr const char* error_fmt<char>() noexcept {
		return "Error %X at position %d : '%.8s'\n";
	}
	template<>
	inline constexpr const char* error_fmt<wchar_t>() noexcept {
		return "Error %X at position %d : '%.8ls'\n";
	}
	template<>
	inline constexpr const char* error_fmt<char16_t>() noexcept {
		return "Error %X at position %d : '%.8us'\n";
	}
	template<>
	inline constexpr const char* error_fmt<char32_t>() noexcept {
		return "Error %X at position %d : '%.8Us'\n";
	}

	template<>
	class test_buffer<0> : public istream {
	public:
		test_buffer() noexcept
			: pos(0), ptr(nullptr), err(error_t::noerror) { }
		inline size_t count() const noexcept { return pos; }
		bool get(char_t& val) noexcept {
			val = ptr[pos];
			if( val == 0 ) {
				val = iostate::eos_c;
				error(error_t::eof);
				return false;
			}
			++pos;
			return true;
		}
		inline void restart() noexcept {
			clear();
			pos = 0;
		}
		void  set(const char_t * data) noexcept {
			ptr = data;
		}
		void error(error_t e) noexcept {
			if( e != error_t::eof )
				Environment::instance().msg(
					((e & error_t::blocked) != error_t::noerror
					  ? LVL::verbose : LVL::debug), error_fmt<char_t>(), e, pos,
					ptr ? ptr + (pos > 0 ? pos -1 : pos) : ptr);
			err |= e;
			if( ! isvirtual )
				istream::error(e);
		}
		error_t error() const noexcept {
			return err;
		}
		void clear() noexcept {
			if( ! isvirtual )
				istream::clear();
			err = error_t::noerror;
		}
	private:
		size_t 	pos;
		const char_t *ptr;
		error_t err;
	};


	template<config::iostate_is = config::iostate>
	class iostate_i {};

	template<>
	class iostate_i<config::iostate_is::_virtual> : public virtual iostate {
	public:
		inline iostate_i() noexcept : iostate() {}
		void error(error_t) noexcept {}
		void clear() noexcept { }
		error_t error() const noexcept { return error_t::noerror; }
	};


	class nul : public ostream, iostate_i<> {
	public:
		nul() noexcept : pos(0) { }
		bool put(char_t) noexcept { ++pos; return true; }
	private:
		size_t 	pos;
	};

	static inline lexer& json(const char_t* data = nullptr) {
		static test_buffer<0> inp;
		static lexer jsonp(inp);
		if( data != nullptr ) {
			inp.set(data);
			inp.restart();
			jsonp.restart();
			jsonp.skip_bom();
		}
		return jsonp;
	}


}}
using namespace cojson;
using namespace test;
#ifdef CSTRING_PROGMEM
#define NAME(s) static inline progmem<char> s() noexcept { \
		static const char l[] __attribute__((progmem)) = #s; return progmem<char>(l);}
#else
#define NAME(s) static inline constexpr const char* s() noexcept {return #s;}
#endif

#endif /* TOOLS_COMMON_HPP_ */
