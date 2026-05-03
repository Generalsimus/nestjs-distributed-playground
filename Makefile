# Variables
PROTO_DIR := ./proto
TEMPLATE  := ./proto/buf.gen.yaml
VENDOR_DIR := ./proto/vendor
SERVICES_DIR := ./services

.PHONY: proto-update proto-vendor proto-gen copy-shared proto

# 1. Update dependencies in buf.lock
proto-update:
	@echo "📦 Updating Buf dependencies..."
	@buf dep update $(PROTO_DIR)

# 2. Extract external dependencies to the local vendor folder for NestJS/Docker
proto-vendor:
	@echo "📥 Vendoring Google and Protovalidate dependencies..."
	@rm -rf $(VENDOR_DIR) # Clean the folder first to prevent stale files
	@mkdir -p $(VENDOR_DIR)
	@buf export buf.build/googleapis/googleapis -o $(VENDOR_DIR)
	@buf export buf.build/bufbuild/protovalidate -o $(VENDOR_DIR) 

# 3. Generate the code (TS, OpenAPI) AND the Binary Descriptor
proto-gen:
	@echo "🛠️ Generating TypeScript, OpenAPI docs, and Descriptor..."
	@buf generate $(PROTO_DIR) --template $(TEMPLATE) --include-imports
	@buf build $(PROTO_DIR) -o $(PROTO_DIR)/proto-descriptor.bin

# 4. Copy the generated/shared files into the service folders
copy-shared:
	@echo "📋 Cleaning old files and copying proto code to services..."
	
	@rm -rf ./services/user-services/shared/proto/
	@mkdir -p ./services/user-services/shared/proto/
	@cp -r proto/* ./services/user-services/shared/proto/

	@rm -rf ./gateway/shared/proto
	@mkdir -p ./gateway/shared/proto
	@cp -r proto/* ./gateway/shared/proto

# THE MAIN COMMAND: Runs all steps in order
proto: proto-update proto-vendor proto-gen copy-shared
	@echo "✅ All protobufs updated, vendored, and generated successfully!"