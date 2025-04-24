# Makefile for building and packaging the Obsidian Markdown Viewer extension

EXT_NAME=obsidian-markdown-viewer
EXT_VERSION=$(shell grep '"version"' manifest.json | head -1 | awk -F: '{ print $$2 }' | sed 's/[", ]//g')
ZIP_NAME=$(EXT_NAME)-$(EXT_VERSION).zip

.PHONY: all clean build package bump-version changelog publish release

all: build

build:
	@echo "No build step required for plain JS extension."

package:
	@echo "Packaging extension as $(ZIP_NAME) ..."
	@if [ "$(OS)" = "Windows_NT" ]; then \
	  powershell -Command "Compress-Archive -Path * -DestinationPath $(ZIP_NAME)"; \
	else \
	  zip -r $(ZIP_NAME) . -x '*.git*'; \
	fi

clean:
	@echo "Cleaning up zip files..."
	@if [ "$(OS)" = "Windows_NT" ]; then \
	  del /Q *.zip; \
	else \
	  rm -f *.zip; \
	fi

bump-version:
	@echo "Bumping version..."
	@npm version patch --no-git-tag-version

changelog:
	@echo "Generating changelog..."
	@node scripts/changelog.js

publish: bump-version changelog package
	@echo "Ready to publish $(ZIP_NAME). Upload the zip to the Chrome Web Store or Edge Add-ons."

release: publish
	@node scripts/release.js
