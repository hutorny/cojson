#pragma once
#pragma message "Default configuration.h used, make your own instead"

/* Default application configuration may use blank configuration.h file
 * Just place it in include path earlier than src/configuration.h
 *
 * To read more about CCS concepts please visit
 * http://hutorny.in.ua/research/cascaded-configuration-sets-for-c1y
 *
 * To make a custom configuration, you may copy this file, uncomment
 * its body and adjust it as necessary,
 *
 * /

#include <cojson.ccs>

namespace configuration {
	namespace target {
		class MyTarget; // define one or more targets
		class MyOtherTarget;
	}

	template<typename build>
	struct Configuration<cojson::config, target::MyTarget, build>
	  : Configuration<cojson::config, target::All, build> {

		/// controls behavior on integral overflow
		//  static constexpr overflow_is overflow = overflow_is::error;

		/// controls implementation of iostate::error
		//  static constexpr iostate_is iostate = iostate_is::_virtual;

		/// controls default null handling.
		//  static constexpr null_is null = null_is::error;

		/// controls write implementation for double values
		//  static constexpr write_double_impl_is write_double_impl = write_double_impl_is::with_sprintf;

		/// for internal double write controls integer type used for representing mantissa and fraction
		//  using write_double_integral_type = uint64_t;

		/// for internal double write controls precision (significant digits)
		//  static constexpr unsigned write_double_precision = 12;
	};

	template<typename build>
	struct Configuration<cojson::details::lexer, target::Codegen, build>
	  : Configuration<cojson::details::lexer, target::All, build> {
		/// controls behavior on read encountered element mismatching the target data type
		//  static constexpr auto mismatch = cojson::default_config::mismatch_is::skipped;

		/// controls size of temporary buffer
		//  static constexpr unsigned temporary_size = 32;

		/// controls implementation of temp buffer, used for reading names
		//  static constexpr auto temporary_static = false;

		/// sets maximal length of a JSON key length
		//  static constexpr unsigned max_key_length = 128;
	  };

	/// If necessary, add Configuration specialization for other targets

	/// Specify what is the currently selected target
	template<> struct Selector<cojson::details::lexer> : Is<target::MyTarget, build::Default> {};
	template<> struct Selector<cojson::config> : Is<target::MyTarget, build::Default> {};
}

//*/
