#pragma once
#include "cojson.ccs"

namespace configuration {
	namespace build { struct Test;	}
	template<>
	struct Configuration<cojson::config, target::All, build::Test>
		:  Configuration<cojson::config, target::All, build::Default> {
#	ifdef TEST_OVERFLOW_ERROR
		static constexpr auto overflow 	= overflow_is::error;
#	endif
#	ifdef TEST_OVERFLOW_SATURATE
		static constexpr auto overflow 	= overflow_is::saturated;
#	endif
#	ifdef TEST_WITH_SPRINTF
	static constexpr write_double_impl_is write_double_impl =
			write_double_impl_is::with_sprintf;
#	endif
#	ifdef CSTRING_PROGMEM
		static constexpr cstring_is cstring = cstring_is::avr_progmem;
	#endif
		static constexpr unsigned write_double_precision = 6;
	};
	template<>	struct Selector<cojson::config> : Is<target::All, build::Test> {};
}
