APP = leonwigley
DEPLOY_DIR = $(APP)

REMOTE = myvps
REMOTE_PATH = /var/www/$(APP)/

.PHONY: all build prepare deploy clean

all: deploy

build:
	cargo build --release

prepare: build
	mkdir -p $(DEPLOY_DIR)
	cp target/release/$(APP) $(DEPLOY_DIR)/
	cp -r public $(DEPLOY_DIR)/
	cp nginx.conf $(DEPLOY_DIR)/
	@echo "Local preparation complete: $(DEPLOY_DIR)/"

deploy: prepare
	ssh $(REMOTE) "mkdir -p $(REMOTE_PATH)"
	rsync -r --delete $(DEPLOY_DIR)/ $(REMOTE):$(REMOTE_PATH)
	@echo "Remote deployment complete at $(REMOTE_PATH)"

clean:
	cargo clean
	rm -rf $(DEPLOY_DIR)
