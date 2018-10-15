/* Example of using cojson::autos and cojson::operators    					*/
#include <iostream>
#include <cojson_stdlib.hpp>
#include <csignal>

using namespace std;
using namespace cojson;
using namespace cojson::autos;
using namespace cojson::operators;

struct MyClass {
	bool led;							/* different types of scalar members */
	char hello[32];
	int Int;
	unsigned Unsigned;
	unsigned vect[3];					/* array of numbers					*/
	char strings[2][32];				/* array of fixed size strings		*/
	std::string stdstring;				/* std::string 						*/
	std::vector<double> stdvector; 		/* std::vector of plain type		*/

	struct Objs {						/* inner class of objects 			*/
		unsigned x;
		unsigned y;
	public:
		static const auto& json() noexcept {
			return O<Objs, &Objs::x, &Objs::y>();
		};
	};
	std::vector<Objs> objs;				/* array of objects					*/

										/* getters/setters					*/
	bool latch() const noexcept {	return latch_;	}
	void setlatch(bool v) noexcept {	latch_ = v;	}
	void trig(bool v) noexcept { latch_ ^= v; }
	volatile bool latch_;

	/* constant strings														*/
	const char* const strconst  =
			"A constant (read-only) string as const char* const member";
	const char* conststr  = "A constant (read-only) string via member";
	inline constexpr const char* cstring() const noexcept {
		return "A constant (read-only) string via getter";
	}

	/* JSON model definition and bindings 									*/
	static const auto& json() noexcept {
		return O<MyClass,
			&MyClass::led,							/* plain members		*/
			&MyClass::Int,
			&MyClass::strings,
			P<&MyClass::latch, &MyClass::setlatch>, /* getter/setter		*/
			&MyClass::trig,							/* setter only			*/
			&MyClass::strconst,						/* constant strings		*/
			&MyClass::cstring,
			&MyClass::conststr,
			&MyClass::stdstring,					/* std::string			*/
			&MyClass::stdvector,					/* std::vector			*/
			P<&MyClass::objs,&MyClass::Objs::json>	/* array of objects		*/
		>();
	}
};


int main(int argc, char** argv) {
	MyClass object { 11, "---", true, {}, 7};
	static bool volatile terminated = !(argc > 1 && string(argv[1]) == "-loop");
	std::signal(SIGTERM,[](int){ terminated = true; });
	do {
		cout << object << endl;						/* writing JSON			*/
		cin >> object;								/* redading JSON		*/

		if( cin.fail() ) {				/* recovering in case of an error 	*/
			cin.clear();
			if( terminated ) break;
			cerr << endl << "JSON error" << endl;
			string ignore;
			getline(cin, ignore);
		}
	} while( ! terminated );
	cout << object << endl;
    return !cin.good();
}
