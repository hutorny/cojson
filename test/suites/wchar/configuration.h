#pragma once
#include "cojson.ccs"

//#pragma message "wchar configuration in use"

namespace configuration {
	namespace build { struct Test;	}
	template<>
	struct Configuration<cojson::config, target::All, build::Test>
		:  Configuration<cojson::config, target::All, build::Default> {
#			ifdef TEST_WCHAR_T
				typedef wchar_t char_t;
#			endif
#			ifdef TEST_CHAR16_T
				typedef char16_t char_t;
#			endif
#			ifdef TEST_CHAR32_T
				typedef char32_t char_t;
#			endif
			static constexpr unsigned write_double_precision = 6;
	};
	template<>
	struct Selector<cojson::config> : Is<target::All, build::Test>{};

	template<>
	struct Configuration<elemental::config, target::All, build::Test>
	  : Configuration<elemental::config, target::All, build::Default> {
			typedef Configuration<cojson::config, target::All, build::Test>::char_t char_t;
	};

	template<>
	struct Selector<elemental::config> : Is<target::All, build::Test>{};

}
