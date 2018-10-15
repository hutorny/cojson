/*
 * Copyright (C) 2018 Eugene Hutorny <eugene@hutorny.in.ua>
 *
 * cojson_autos.hpp - templates with parameter deducing
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
 * You should have received a copy of the GNU General Public License v2
 * along with the COJSON Library; if not, see
 * <http://www.gnu.org/licenses/gpl-2.0.html>.
 */

#pragma once

#if __cplusplus < 201703L
#   error This file should be compiled with a c++17 capable compiler
#endif

#include <cojson.hpp>
#include <nameof.hpp>


namespace cojson {

namespace details {
template<auto Property>
cstring nameof() noexcept {
	static constexpr auto name = nameOf::nameof<Property>();
	return name.data();
}

/* set of templates for parameter deducing								*/
template<typename Member>
struct Make;

template<class C, typename T>
struct Make<T C::*> {
	using Class = C;
	using value_type = T;
	template<T C::*Member>
	static inline const property<C>& item() noexcept {
		return PropertyScalarMember<C, nameof<Member>, T, Member>();
	}
};

template<class C, typename T>
struct Make<T C::* const> {
	using Class = C;
	using value_type = T;
	template<T C::* const Member>
	static inline const property<C>& item() noexcept {
		return PropertyScalarMember<C, nameof<Member>, T, Member>();
	}
};

template<class C, typename T, size_t N>
struct Make<T (C::*)[N]> {
	using Class = C;
	using value_type = T;
	template<T (C::*Member)[N]>
	static inline const property<C>& item() noexcept {
		return PropertyVector<C, nameof<Member>, T, N, Member>();
	}
};

template<class C, size_t N>
struct Make<char_t (C::*)[N]> {
	using Class = C;
	using value_type = char_t;
	template<char_t (C::*Member)[N]>
	static inline const property<C>& item() noexcept {
		return PropertyString<C, nameof<Member>, N, Member>();
	}
};

template<class C, size_t N, size_t M>
struct Make<char_t (C::*)[N][M]> {
	using Class = C;
	using value_type = char_t;
	template<char_t (C::*Member)[N][M]>
	static inline const property<C>& item() noexcept {
		return PropertyStrings<C, nameof<Member>, N, M, Member>();
	}
};

template<class C, typename T>
struct Make<T (C::*)() const noexcept> {
	using Class = C;
	using value_type = T;
	template<T (C::*Getter)() const noexcept>
	static inline const property<C>& item() noexcept {
		return PropertyScalarAccessor<C, nameof<Getter>,
				accessor::methods<C,T, Getter, nullptr>>();
	}
};


template<class C>
struct Make<const cstring C::*> {
	using Class = C;
	using value_type = cstring;
	template<const cstring C::* Member>
	static inline const property<C>& item() noexcept {
		return PropertyConstString<C, nameof<Member>, Member>();
	}
};

template<class C>
struct Make<cstring C::*> {
	using Class = C;
	using value_type = cstring;
	template<cstring C::*Member>
	static inline const property<C>& item() noexcept {
		return PropertyConstString<C, nameof<Member>,
				const_cast<const cstring C::*>(Member)>();
	}
};

template<class C>
struct Make<cstring (C::*)() const noexcept> {
	using Class = C;
	using value_type = cstring;
	template<cstring (C::*Member)() const noexcept>
	static inline const property<C>& item() noexcept {
		return PropertyCstring<C, nameof<Member>, Member>();
	}
};


template<class C, typename T>
struct Make<void (C::*)(T) noexcept> {
	using Class = C;
	using value_type = T;
	template<void (C::*Setter)(T) noexcept>
	static inline const property<C>& item() noexcept {
		return PropertyScalarAccessor<C, nameof<Setter>,
				accessor::methods<C,T, nullptr, Setter>>();
	}
};

template<class C>
struct Make<const property<C>& (*)() noexcept> {
	using Class = C;
	using value_type = void;
	template<const property<C>& (*Node)()>
	static inline const property<C>& item() noexcept {
		return Node();
	}
};


template<typename A, typename B>
struct Make2;

template<class C, typename T>
struct Make2<T (C::*)() const noexcept, void (C::*)(T) noexcept> {
	using Class = C;
	using value_type = T;
	template<T (C::*Getter)() const noexcept, void (C::*Setter)(T) noexcept>
	static inline const property<C>& item() noexcept {
		return details::PropertyScalarAccessor<C, nameof<Getter>,
			accessor::methods<C, T, Getter, Setter>>();
	}
};

template<class C, class T>
struct Make2<T C::*, const clas<T>& (*)() noexcept> {
	using Class = C;
	using value_type = T;
	template<T C::*Member,const details::clas<T>& S()>
	static inline const property<C>& item() noexcept {
		return PropertyObject<C, nameof<Member>, T, Member, S>();
	}
};

template<class C, class T>
struct Make2<T C::*, const clas<T>& (T::*)() const noexcept> {
	using Class = C;
	using value_type = T;
	template<T C::*Member,const details::clas<T>& S()>
	static inline const property<C>& item() noexcept {
		return PropertyObject<C, nameof<Member>, T, Member, S>();
	}
};

template<class C, class T, size_t N>
struct Make2<T (C::*)[N], const clas<T>& (*)() noexcept> {
	using Class = C;
	using value_type = T;
	template<T (C::*Member)[N],const details::clas<T>& S()>
	static inline const property<C>& item() noexcept {
		return PropertyArrayOfObjects<C, nameof<Member>, T, N, Member, S>();
	}
};

template<class C>
struct Make1 {
	using Class = C;
	using value_type = cstring;
	template<cstring const *Member>
	static inline cstring str() noexcept {
		return *Member;
	}
	template<cstring const *Member>
	static inline const property<C>& item() noexcept {
		return PropertyExternValue<C, nameof<Member>,
			ValueConstStringFunction<Make1::str<Member>>>();
	}
	template<cstring (*Member)() noexcept>
	static inline const property<C>& item() noexcept {
		return PropertyExternValue<C, nameof<Member>,
			ValueConstStringFunction<Member>>();
	}
};

template<auto V>
using classof = typename Make<decltype(V)>::Class;
template<auto V>
using type = typename Make<decltype(V)>::value_type;


template<auto F, auto ... L>
struct firstof {
	static constexpr auto value = F;
	using type = decltype(F);
};


}

namespace autos {

/** A property that needs two parameters to specify, for example:
 *  a) Getter, Setter
 *  b) pointer to Object and pointer to json method
 */
template<auto One, auto Two>
inline const details::property<details::classof<One>>&
Property() noexcept {
	return details::Make2<decltype(One), decltype(Two)>::
			template item<One, Two>();
}

/** Short name template for dual-parameters property					*/
template<auto One, auto Two>
inline const details::property<details::classof<One>>&
P() noexcept {
	return details::Make2<decltype(One), decltype(Two)>::
			template item<One, Two>();
}

/** A property that needs just one parameters to specify:
 *   - a pointer to member												*/
template<auto Member>
inline const details::property<details::classof<Member>>&
Property() noexcept {
	return details::Make<decltype(Member)>::template item<Member>();
}

/** A property of list type
 *   - a pointer to member												*/
template<auto ... Members>
inline const details::property<
	details::classof<details::firstof<Members...>::value>>&
PropertyList() noexcept {
	using Class = details::classof<details::firstof<Members...>::value>;
	return details::PropertyList<Class,
			details::nameof<details::firstof<Members...>::value>,
			Property<Members>...>();
}

/** Property - static constant string									*/
template<class C, cstring const *Member>
inline const details::property<C>&
PropertyStaticString() noexcept {
	return details::Make1<C>::template item<Member>();
}

/** Property - static constant string via a function					*/
template<class C, cstring (*Member)() noexcept>
inline const details::property<C>&
PropertyFunctionString() noexcept {
	return details::Make1<C>::template item<Member>();
}

/** Short name template for pointer-to-member property					*/
template<auto Member>
inline const details::property<details::classof<Member>>&
P() noexcept {
	return details::Make<decltype(Member)>::template item<Member>();
}

/** Short name template for static constant string						*/
template<class C, cstring const *Member>
inline const details::property<C>&
P() noexcept {
	return details::Make1<C>::template item<Member>();
}

/** JSON model definition by class and list of pointers or
 *  regular property definitions										*/
template<class Class, auto ... Properties>
inline const details::clas<Class>& Object() noexcept {
	return details::ObjectClass<Class, Property<Properties> ... >();
}

/** Short-name template for JSON model definition						*/
template<class Class, auto ... Properties>
inline const details::clas<Class>& O() noexcept {
	return details::ObjectClass<Class, Property<Properties> ... >();
}

}}
