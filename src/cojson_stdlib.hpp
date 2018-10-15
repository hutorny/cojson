/*
 * Copyright (C) 2018 Eugene Hutorny <eugene@hutorny.in.ua>
 *
 * cojson_stdlib.hpp - string and vector values, wrapper classes for standard streams
 *
 * This file is part of COJSON Library. http://hutorny.in.ua/projects/cojson
 * This file is part of µcuREST Library. http://hutorny.in.ua/projects/micurest
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
#pragma once

#include <string>
#include <vector>
#if __cplusplus >= 201703L && (!defined(__GNUC__) || __GNUC__ >= 7)
#	include <cojson_autos.hpp>
#	define WITH_COJSON_AUTOS
#else
#	include <cojson.hpp>
#endif

namespace cojson {

namespace accessor {

/**
 * std::vector accessor
 */
template<typename Vector, Vector *V>
struct stdvector {
	using clas = typename Vector::value_type;
	using type = typename Vector::value_type;
	using difftype = typename Vector::difference_type;

	using T = type;
	static constexpr bool canget = true; /* array is accessible for reading */
	static constexpr bool canset = true;
	static constexpr bool canlref   = false;
	static constexpr bool canrref   = true;
	static constexpr bool is_vector = true;
	static inline bool has(size_t i) noexcept { return i < V->size(); }
	static inline constexpr bool is(size_t) noexcept { return true; }
	static inline const T get(size_t i) noexcept { return (*V)[i]; }
	static T& lref(size_t) noexcept;
	static inline const T& rref(size_t i) noexcept { return (*V)[i]; }
	static inline void set(size_t i, const T & v) noexcept { __try { V->resize(i+1,v); } __catch(...) {} }
	static inline void init(T&) noexcept {}
	static inline constexpr bool null(void_t) noexcept {
		return not config::null_is_error;
	}
private:
	stdvector();
};


}

namespace details {

template<class String>
bool read_string(String& dst, lexer& in) throw()  {
	ctype ct;
	bool first = true;
	typename String::value_type chr;
	dst.clear();
	while( hasbits((ct=in.string(chr, first)), ctype::string | ctype::hex) ) {
		dst.push_back(chr);
		first = false;
		if( hasbits(ct, ctype::hex) ) {
			dst.push_back(in.hexremainder());
		}
	}
	dst.push_back(0);
	if( ct == ctype::eof || ct == ctype::null ) {
		return ct == ctype::eof || ! config::null_is_error;
	}
	return true;
}


#ifdef _BASIC_STRING_H
template<>
struct reader<std::string> {
	static inline bool read(std::string& dst, lexer& in) noexcept {
		__try { return read_string(dst, in); } __catch(...) { return false; }
	}
};

template<>
struct writer<std::string> {
	static inline bool write(const std::string& str, ostream& out) noexcept {
		using char_type = typename std::string::value_type;
		return writer<const char_type *>::write(str.c_str(), out);
	}
};
#endif

/**
 * string value implementation
 */
template<class String>
struct stdstring : value {
	inline stdstring(String& s) noexcept
	  : str(s) {}
	bool read(lexer& in) const noexcept {
		ctype ct;
		if( ! isvalid(ct=in.value(ctype::stringnull)) )
			return in.skip();
		if( ct == ctype::null ) {
			if( null() ) return true;
			in.error(error_t::mismatch);
			return false;
		}
		return reader<String>::read(str, in);
	}
	bool write(ostream& out) const noexcept {
		return writer<String>::write(str, out);
	}
	inline bool null() const noexcept {
		str.clear();
		return ! config::null_is_error;
	}
private:
	String& str;
};


/** ValueStdString
 * JSON string bound to an std::basic_string
 */
template<class String, String* str>
inline const details::value& ValueStdString() noexcept {
	static_assert(str != nullptr, "str must not be null");
	static const stdstring<String> l(*str);
	return l;
}


#ifdef _BASIC_STRING_H
/** ValueStdString
 * JSON string bound to an std::string
 */
template<std::string* str>
inline const details::value& ValueStdString() noexcept {
	static_assert(str != nullptr, "str must not be null");
	static stdstring<std::string> l(*str);
	return l;
}
#endif
/** ValueStdVector
 * value - a vector of T accessible via std::vector
 */
template<class Vector, Vector* V>
inline const details::value& ValueStdVector() noexcept {
	static_assert(V != nullptr, "V must not be null");
	static const details::vector<accessor::stdvector<Vector,V>> l;
	return l;
}


/**
 * std::string class property
 */
template<class C, details::name id, class String, String C::*M>
const details::property<C> & PropertyStdString() noexcept {
	static const struct local : details::property<C> {
		cstring name() const noexcept { return id(); }
		bool read(C& obj, details::lexer& in) const noexcept {
			return details::reader<String>::read(obj.*M, in);
		}
		bool write(const C& obj, details::ostream& out) const noexcept {
			return details::writer<String>::write(obj.*M, out);
		}
	} l;
	return l;
}

template<class C, details::name id, class Vector, Vector C::*M>
inline const details::property<C>&  PropertyStdVector() noexcept {
	static_assert(M != nullptr, "M must not be null");
	//static const details::vector<accessor::stdvector<Vector,V>> l;
	static const struct local : details::property<C> {
		using T = typename Vector::value_type;
		cstring name() const noexcept { return id(); }
		bool read(C& obj, details::lexer& in) const noexcept {
			(obj.*M).clear();
			return details::collection<>::read(*this, obj, in);
		}
		bool write(const C& obj, details::ostream& out) const noexcept {
			/* delegate write to array */
			return details::array::write(*this, obj, out);
		}
		/** read item */
		inline bool read(C& obj, details::lexer& in, size_t i) const noexcept {
			__try { (obj.*M).resize(i+1); } __catch(...) { return false; }
			return
				details::reader<T>::read((obj.*M)[i], in) || in.skip(false);
		}
		/** write item item */
		inline bool write(const C& obj, details::ostream& out, size_t i) const noexcept {
			return i < (obj.*M).size() && details::writer<T>::write((obj.*M)[i], out) && (i+1) < (obj.*M).size();
		}
	} l;
	return l;
}

/** PropertyArrayOfObjects
 * nested in C array of objects of type T with structure S
 */
template<class C, details::name id, class Vector, Vector C::*M,
	const details::clas<typename Vector::value_type>& S()>
inline const details::property<C> & PropertyStdVector() {
	static const struct local : details::property<C> {
		cstring name() const noexcept { return id(); }
		bool read(C& obj, details::lexer& in) const noexcept {
			return details::collection<>::read(*this, obj, in);
		}
		bool write(const C& obj, details::ostream& out) const noexcept {
			return details::array::write(*this, obj, out);
		}
		/** read item */
		inline bool read(C& obj, details::lexer& in, size_t i) const noexcept {
			__try { (obj.*M).resize(i+1); } __catch(...) { return false; }
			return S().read((obj.*M)[i], in);
		}
		/** write item item */
		inline bool write(const C& obj, details::ostream& out,
				size_t i) const noexcept {
			return i < (obj.*M).size() && S().write((obj.*M)[i], out) && (i+1) < (obj.*M).size();
		}
	} l;
	return l;
}
}

namespace wrapper {

template<class Ostream>
class ostream : public details::ostream {
private:
	Ostream& out;
public:
	inline ostream(Ostream& o) noexcept : out(o) {}
	bool put(char_t c) noexcept {
		out.put(c);
		if( out.good() ) return true;
		details::ostream::error(details::error_t::ioerror);
		return false;
	}
};

template<class Istream>
class istream : public details::lexer, protected details::istream {
private:
	Istream& in;
public:
	bool get(char_t& c) noexcept {
		in.get(c);
		if( in.good() ) return true;
		if( in.eof() ) {
			details::istream::error(details::error_t::eof);
			c = iostate::eos_c;
		} else {
			details::istream::error(details::error_t::ioerror);
			c = iostate::err_c;
		}
		return false;
	}
	using lexer::error;
public:
	inline istream(Istream& i) noexcept
	  :	lexer(static_cast<details::istream&>(*this)), in(i) {}
};
}



/**
 * JSON string bound to an std::basic_string
 */
template<class String, String* str>
inline const details::value& S() noexcept {
	return details::ValueStdString<String, str>();
}

#ifdef _BASIC_STRING_H
/**
 * JSON string bound to an std::string
 */
template<std::string* str>
inline const details::value& S() noexcept {
	return details::ValueStdString<str>();
}
#endif
/**
 * value - a vector of T accessible via std::vector
 */
template<class Vector, Vector* vector, typename Void>
inline const details::value& V() noexcept {
	return details::ValueStdVector<Vector, vector>();
}


template<class C, details::name id, class Vector, Vector C::*M>
inline const details::property<C>&  V() noexcept {
	return details::PropertyStdVector<C, id, Vector, M>();
}

/** PropertyArrayOfObjects
 * nested in C array of objects of type T with structure S
 */
template<class C, details::name id, class Vector, Vector C::*M,
	const details::clas<typename Vector::value_type>& S()>
inline const details::property<C> & P() {
	return details::PropertyStdVector<C, id, Vector, M, S>();
}

#ifdef WITH_COJSON_AUTOS

namespace details {

template<class C, typename T, class A>
struct Make<std::vector<T,A> C::*> {
	using Class = C;
	using value_type = T;
	template<std::vector<T,A> C::* Member>
	static inline const property<C>& item() noexcept {
		return PropertyStdVector<C, nameof<Member>, std::vector<T,A>, Member>();
	}
};

template<class C, class Vector>
struct Make2<Vector C::*, const clas<typename Vector::value_type>& (*)() noexcept> {
	using Class = C;
	using value_type = typename Vector::value_type;
	template<Vector C::*Member,const details::clas<value_type>& S()>
	static inline const property<C>& item() noexcept {
		return PropertyStdVector<C, nameof<Member>, Vector, Member, S>();
	}
};



}
#endif


namespace details {

template<typename T>
inline constexpr bool isgood(T);

template<>
inline constexpr bool isgood<bool>(bool result) { return result; }

template<>
inline constexpr bool isgood<error_t>(error_t result) {
	return result == error_t::noerror;
}


template<class Stream, class Class,
	bool hasjson = false, bool haswrite = false>
struct operator_write {
	static Stream& write(Stream& stream, const Class& object) {
		static_assert(hasjson || haswrite ,"No serializer available");
		return stream;
	}
};

template<class Stream, class Class, bool hasjson>
struct operator_write<Stream, Class, hasjson, true> {
	static Stream& write(Stream& stream, const Class& object) {
	    wrapper::ostream<Stream> out(stream);
	    object.write(out);
		return stream;
	}
};

template<class Stream, class Class>
struct operator_write<Stream, Class, true, false> {
	static Stream& write(Stream& stream, const Class& object) {
	    wrapper::ostream<Stream> out(stream);
	    object.json().write(object, out);
		return stream;
	}
};

template<class Stream, class Class,
	bool hasjson = false, bool hasread = false>
struct operator_read {
	static Stream& read(Stream& s, Class& o) {
		static_assert(hasjson || hasread ,"No deserializer available");
		return s;
	}
};

template<class Stream, class Class, bool hasjson>
struct operator_read<Stream, Class, hasjson, true> {
	static Stream& read(Stream& stream, Class& object) {
	    wrapper::istream<Stream> in(stream);
	    if( !isgood((object.read(in),true)) || !isgood(in.error()) ) {
	    	stream.setstate(stream.failbit);
	    }
		return stream;
	}
};

template<class Stream, class Class>
struct operator_read<Stream, Class, true, false> {
	static Stream& read(Stream& stream, Class& object) {
	    wrapper::istream<Stream> in(stream);
	    if( !isgood(object.json().read(object, in)) || !isgood(in.error()) ) {
	    	stream.setstate(stream.failbit);
	    }
		return stream;
	}
};
}

namespace operators {
/** operator<<
 *  writes object as JSON to an std::ostream compatible stream				 */
template<class Stream, class Class>
inline Stream& operator<<(Stream& stream, const Class& object) {
	return details::operator_write<Stream, Class,
		detectors::has_json<Class>::value,
		detectors::has_write<Class,details::ostream&>::value
	>::write(stream,object);
}

/** operator>>
 * reads JSON object from an std::istream compatible stream					*/
template<class Stream, class Class>
inline Stream& operator>>(Stream& stream, Class& object) {
	return details::operator_read<Stream, Class,
		detectors::has_json<Class>::value,
		detectors::has_read<Class,details::lexer&>::value
	>::read(stream,object);
}

}}
