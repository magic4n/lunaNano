#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

VERSION="0.1.0"
TARGET_ARCH="${1:-${TARGET_ARCH:-$(uname -m)}}"
case "$TARGET_ARCH" in
    x86_64|amd64) ARCH="x86_64" ;;
    aarch64|arm64) ARCH="aarch64" ;;
    *) ARCH="$TARGET_ARCH" ;;
esac

OUTPUT_DIR="${ROOT_DIR}/artifacts"
RPMBUILD_DIR="${ROOT_DIR}/target/rpmbuild"
mkdir -p "${OUTPUT_DIR}" "${RPMBUILD_DIR}/SOURCES" "${RPMBUILD_DIR}/SPECS" "${RPMBUILD_DIR}/RPMS" "${RPMBUILD_DIR}/SRPMS" "${RPMBUILD_DIR}/BUILD" "${RPMBUILD_DIR}/BUILDROOT"

echo "Building LunaNano RPM package v${VERSION} (${ARCH})..."

# Prepare sources directory matching install tree
SOURCE_PAYLOAD="${RPMBUILD_DIR}/SOURCES"
mkdir -p "${SOURCE_PAYLOAD}/bin"
mkdir -p "${SOURCE_PAYLOAD}/share/lunanano/dist"
mkdir -p "${SOURCE_PAYLOAD}/share/wayland-sessions"
mkdir -p "${SOURCE_PAYLOAD}/share/applications"
mkdir -p "${SOURCE_PAYLOAD}/share/icons/hicolor/scalable/apps"
mkdir -p "${SOURCE_PAYLOAD}/etc/greetd"

BIN_DIR="${ROOT_DIR}/target/release"
if [ -n "$RUST_TARGET" ] && [ -d "${ROOT_DIR}/target/${RUST_TARGET}/release" ]; then
    BIN_DIR="${ROOT_DIR}/target/${RUST_TARGET}/release"
fi

if [ -f "${BIN_DIR}/lunanano-compositor" ]; then
    cp "${BIN_DIR}/lunanano-compositor" "${SOURCE_PAYLOAD}/bin/"
    chmod 755 "${SOURCE_PAYLOAD}/bin/lunanano-compositor"
fi

cp "${SCRIPT_DIR}/lunanano-standalone-runner" "${SOURCE_PAYLOAD}/share/lunanano/"
chmod 755 "${SOURCE_PAYLOAD}/share/lunanano/lunanano-standalone-runner"

if [ -f "${BIN_DIR}/lunanano-shell" ]; then
    cp "${BIN_DIR}/lunanano-shell" "${SOURCE_PAYLOAD}/bin/"
    chmod 755 "${SOURCE_PAYLOAD}/bin/lunanano-shell"
else
    ln -sf /usr/share/lunanano/lunanano-standalone-runner "${SOURCE_PAYLOAD}/bin/lunanano-shell"
fi

cp "${SCRIPT_DIR}/lunanano-session" "${SOURCE_PAYLOAD}/bin/"
chmod 755 "${SOURCE_PAYLOAD}/bin/lunanano-session"

if [ -d "${ROOT_DIR}/dist" ]; then
    cp -r "${ROOT_DIR}/dist/"* "${SOURCE_PAYLOAD}/share/lunanano/dist/"
fi

cp "${SCRIPT_DIR}/lunanano.desktop" "${SOURCE_PAYLOAD}/share/wayland-sessions/"
cp "${SCRIPT_DIR}/lunanano.desktop" "${SOURCE_PAYLOAD}/share/applications/"
cp "${SCRIPT_DIR}/lunanano.svg" "${SOURCE_PAYLOAD}/share/icons/hicolor/scalable/apps/"
cp "${SCRIPT_DIR}/greetd-lunanano.conf" "${SOURCE_PAYLOAD}/etc/greetd/lunanano.conf"

# Copy spec file
cp "${SCRIPT_DIR}/lunanano.spec" "${RPMBUILD_DIR}/SPECS/"

# Build RPM
if command -v rpmbuild >/dev/null 2>&1; then
    rpmbuild --define "_topdir ${RPMBUILD_DIR}" --target "${ARCH}" -bb "${RPMBUILD_DIR}/SPECS/lunanano.spec"
    find "${RPMBUILD_DIR}/RPMS" -name "*.rpm" -exec cp {} "${OUTPUT_DIR}/" \;
    echo "RPM successfully created in ${OUTPUT_DIR}/"
    ls -lh "${OUTPUT_DIR}"/*.rpm
elif command -v fpm >/dev/null 2>&1; then
    fpm -s dir -t rpm \
        -n lunanano \
        -v "${VERSION}" \
        -a "${ARCH}" \
        --description "LunaNano Wayland Desktop Shell" \
        --url "https://github.com/superluna/lunaNano" \
        --license "GPL-3.0-or-later" \
        -p "${OUTPUT_DIR}/lunanano-${VERSION}-1.${ARCH}.rpm" \
        -C "${SOURCE_PAYLOAD}" .
    echo "RPM successfully created via fpm in ${OUTPUT_DIR}/"
    ls -lh "${OUTPUT_DIR}"/*.rpm
else
    echo "Warning: Neither rpmbuild nor fpm is installed. Skipping RPM build on this host."
fi
