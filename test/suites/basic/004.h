/*
 * 004.h
 *
 *  Created on: Aug 19, 2015
 *      Author: eugene
 */

#ifndef SUITES_BASIC_004_H_
#define SUITES_BASIC_004_H_

#ifdef __cplusplus
extern "C" {
#	define __noexcept noexcept
#else
#	define __noexcept
#endif

extern unsigned * uitem(unsigned n) __noexcept;
extern const char* strv() __noexcept;

struct CPod {
	char c;
	int  i;
	long l;
	unsigned long long u;
	char s[12];
};
extern struct CPod * cpod() __noexcept;
extern struct CPod dpod;

#ifdef __cplusplus
}
#endif

#endif /* SUITES_BASIC_004_H_ */
