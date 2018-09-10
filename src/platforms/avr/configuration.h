#pragma once
#include "cojson.ccs"
/* example configuration for AVR */
namespace configuration {
	namespace target { struct Avr;	}
	template<>
	struct Configuration<cojson::config, target::Avr, build::Default>
		:  Configuration<cojson::config, target::All, build::Default> {
		// controls behavior on integral overflow
		static constexpr overflow_is overflow = overflow_is::error;
		// controls default null handling.
		static constexpr null_is null = null_is::error;
		// for internal double write controls precision (significant digits)
		static constexpr unsigned write_double_precision = 6;
	};

	template<>
	struct Configuration<elemental::config, target::Avr, build::Default>
	  : Configuration<elemental::config, target::All, build::Default> {
		// this overrides cstring_is::avr_progmem, which is default for AVR default
		//static constexpr cstring_is cstring = cstring_is::const_char;
		//static constexpr cstring_is cstring = cstring_is::avr_progmem;

	};

	template<>	struct Selector<cojson::config> : Is<target::Avr, build::Default> {};
}
