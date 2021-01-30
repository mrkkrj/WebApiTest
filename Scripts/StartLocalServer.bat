::
:: serves local static files, i.e. doesn't have any special API!
::  - supports 3.1 and 3.4 Py installations
::


@echo off

IF EXIST C:\Python31\python.exe (
    set PYEXE=C:\Python31\python.exe
) ELSE (
    set PYEXE=C:\Python34\python.exe
)

echo. 

%PYEXE% -m http.server 8111

pause
