# Copyright (C) 2015 Eugene Hutorny <eugene@hutorny.in.ua>
#
# Makefile - make script to build and run COJSON Library tests
#
# This file is part of COJSON Library. http://hutorny.in.ua/projects/cojson
#
# The COJSON Library is free software; you can redistribute it and/or
# modify it under the terms of the GNU Lesser General Public License v2
# as published by the Free Software Foundation;
#
# The COJSON Library is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU Lesser General Public License for more details.
#
# You should have received a copy of the GNU Lesser General Public License
# along with the COJSON Library; if not, see
# <http://www.gnu.org/licenses/gpl-2.0.html>.

# This makefile builds unit tests for cojson
# It is not intended to build any other applications

MAKEFLAGS += --no-builtin-rules
BASE-DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
TARGET-DIR := $(BASE-DIR)/bin
BUILD-DIR ?= /tmp/cojson

BOLD:=$(shell tput bold)
NORM:=$(shell tput sgr0)

SRC-DIRS :=																	\
  ../src																	\
  suites/basic																\
  suites/bench																\
  suites/host																\
  suites/metrics															\
  suites/wchar																\
  tools																		\


INCLUDES := 																\
  ../src																	\
  tools																		\
  suites/include															\

HOST-TARGETS := host uchar wchar char16 char32 overflow saturate sprintf
MEGA-TARGETS := mega megaa megab
MSP430-TARGETS := msp430fr msp430fra msp430frb msp430frc
TOP-TARGETS := all hosts $(HOST-TARGETS) $(MEGA-TARGETS) $(MSP430-TARGETS)	\
               teensy3 teensy3a pic32mx msp430fr

.PHONY: help

.DEFAULT:

.SUFFIXES:
.SUFFIXES: .hex .elf .o .o.d

help:
	@echo
	@echo "This makefile builds cojson unit tests for various target machines"
	@echo "Supported machines are: Host, Arduino Mega, Teensy3.1"
	@echo "Corresponding makefile goals are:$(BOLD)host mega teensy3$(NORM)"
	@echo "Other top goals covering various aspects:"
	@echo "    $(BOLD)megaa$(NORM)  - unit tests not included in mega"
	@echo "    $(BOLD)megab$(NORM)  - benchmarking tests for Arduino Mega"
	@echo "    $(BOLD)teensy3a$(NORM)-unit tests not included in teensy3"
	@echo "    $(BOLD)uchar$(NORM)  - host tests for unsigned char"
	@echo "    $(BOLD)wchar$(NORM)  - host tests for wchar_t"
	@echo "    $(BOLD)char16$(NORM) - host tests for char16_t"
	@echo "    $(BOLD)char32$(NORM) - host tests for char32_t"
	@echo "    $(BOLD)overflow$(NORM)-tests for error on integral overflow"
	@echo "    $(BOLD)saturate$(NORM)-tests for staturation on integral overflow"
	@echo "Special goals:"
	@echo "    $(BOLD)all$(NORM)           - builds all top goals"
	@echo "    $(BOLD)hosts$(NORM)         - builds all host goals"
	@echo "    $(BOLD)<goal> clean$(NORM)  - cleans working directory"
	@echo "    $(BOLD)<goal> rebuild$(NORM)- makes a clean rebuild"
	@echo "    $(BOLD)<goal> metrics$(NORM)- builds code size metrics for the goal,"
	@echo "                    one of: mega, teensy3, pic32mx, msp430fr"

all: $(filter-out all hosts,$(TOP-TARGETS))
	@$(if $(filter-out clean,$(MAKECMDGOALS)),,								\
		echo "$(BOLD)all done$(NORM)")

hosts: $(HOST-TARGETS)
	

rebuild:: $(filter-out rebuild clean distclean,$(MAKECMDGOALS))
	@echo "$(BOLD)"$(or														\
			$(filter-out rebuild clean distclean, $(MAKECMDGOALS)),\
			$(error Missing top target to rebuild))" rebuild$(NORM) done"

clean:
	@echo "$(BOLD)"$(or $(filter-out rebuild clean distclean, $(MAKECMDGOALS)),\
			$(error Missing top target to clean))" clean$(NORM) done"

distclean::
	@rm -rf $(BUILD-DIR) $(TARGET-DIR)/*
	@rm *.vars *.metrics.txt

Makefile : ;

%.mk :: ;

$(TARGET-DIR):
	@mkdir -p $@

$(BUILD-DIR):
	@mkdir -p $@

uchar:    MK := host
wchar:    MK := host
char16:   MK := host
char32:   MK := host
overflow: MK := host
saturate: MK := host
sprintf:  MK := host
megab:    MK := mega
megaa:    MK := mega
megam:    MK := mega
teensy3a: MK := teensy3
msp430fra:MK := msp430fr
msp430frb:MK := msp430fr
msp430frc:MK := msp430fr

metrics::
	@echo $(wildcard														\
	  		$(or $(filter-out $@, $(MAKECMDGOALS)),							\
				 $(error Missing top target for metrics)).metrics.txt)		

run::
	@echo $(wildcard														\
	  		$(or $(filter-out $@ mega% teensy%, $(MAKECMDGOALS)),			\
				 $(error Missing top target to run)).metrics.txt)		


%:: $(TARGET-DIR) $(BUILD-DIR)
	@mkdir -p $(BUILD-DIR)/$@
	@$(if $(filter clean,$(MAKECMDGOALS)),,echo "$(BOLD)make$(NORM) $@")
	@$(MAKE) $(or $(filter-out $(TOP-TARGETS), $(MAKECMDGOALS)), $@)		\
		--no-print-directory 												\
		-C $(BUILD-DIR)/$@													\
		-f $(BASE-DIR)/$(if $(MK),$(MK),$@).mk								\
		TARGET=$@															\
		TARGET-DIR=$(TARGET-DIR)											\
		BASE-DIR=$(BASE-DIR)												\
		SRC-DIRS="$(realpath $(addprefix $(BASE-DIR)/,$(SRC-DIRS)))"		\
		INCLUDES="$(realpath $(addprefix $(BASE-DIR)/,$(INCLUDES)))"		\

