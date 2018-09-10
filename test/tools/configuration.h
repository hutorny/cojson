#pragma once
#include "cojson.ccs"

namespace configuration {
	namespace build { struct Test;	}
	template<typename Target>
	struct Configuration<cojson::config, Target, build::Test>
	  : Configuration<cojson::config, Target, build::Default> {
		static constexpr unsigned write_double_precision = 6;
	};

	struct Current : Is<target::All, build::Test> {};
	template<>	struct Selector<cojson::config> : Current {};
	template<>	struct Selector<cojson::details::lexer> : Current {};
}
