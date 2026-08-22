from setuptools import setup, find_packages

setup(
    name="sitecompiler-py",
    version="1.0.0",
    description="Official Python SDK for the SiteCompiler Website Compilation API",
    author="Subhankar Roy",
    packages=find_packages(),
    install_requires=[
        "httpx>=0.25.0",
        "pydantic>=2.0.0",
    ],
    python_requires=">=3.9",
)
