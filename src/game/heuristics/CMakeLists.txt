cmake_minimum_required(VERSION 3.7)
project(libgomoku-heuristics)

set(CMAKE_CXX_STANDARD 11)
file(GLOB Sources "*.c")
add_library(heuristics STATIC ${Sources})