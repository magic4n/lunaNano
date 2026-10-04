#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

VERSION="0.1.0"
ARCH="$(dpkg --print-architecture 2>/dev/null || uname -m)"
case "$ARCH" in
    x86_64) ARCH="amd64" ;;
    aarch64) ARCH="arm64" ;;
esac

STAGING_DIR="${ROOT_DIR}/target/deb-staging"
OUTPUT_DIR="${ROOT_DIR}/artifacts"
mkdir -p "${STAGING_DIR}" "${OUTPUT_DIR}"

echo "Building LunaNano Debian package v${VERSION} (${ARCH})..."

# 1. Clean staging directory
rm -rf "${STAGING_DIR}"
mkdir -p "${STAGING_DIR}/DEBIAN"
mkdir -p "${STAGING_DIR}/usr/bin"
mkdir -p "${STAGING_DIR}/usr/share/lunanano/dist"
mkdir -p "${STAGING_DIR}/usr/share/wayland-sessions"
mkdir -p "${STAGING_DIR}/usr/share/applications"
mkdir -p "${STAGING_DIR}/usr/share/icons/hicolor/scalable/apps"
mkdir -p "${STAGING_DIR}/etc/greetd"

# 2. Control file
cat <<EOF > "${STAGING_DIR}/DEBIAN/control"
Package: lunanano
Version: ${VERSION}
Section: x11
Priority: optional
Architecture: ${ARCH}
Maintainer: superLuna Ecosystem <dev@superluna.local>
Depends: libgtk-3-0, pipewire, wireplumber, brightnessctl, network-manager, bluez, power-profiles-daemon, wl-clipboard, grim, slurp, wf-recorder, xwayland
Description: LunaNano Wayland Desktop Shell
 LunaNano is an ultra-lightweight, aesthetic Wayland desktop shell
 built with React, TypeScript, Material You 3, and a high-performance
 Rust compositor with native XWayland support.
EOF

# 3. Post-install script
cat <<'EOF' > "${STAGING_DIR}/DEBIAN/postinst"
#!/bin/sh
set -e
update-desktop-database -q 2>/dev/null || true
gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor 2>/dev/null || true
echo "LunaNano installed successfully. Select 'LunaNano' at login."
exit 0
EOF
chmod 755 "${STAGING_DIR}/DEBIAN/postinst"
chmod 755 "${STAGING_DIR}" "${STAGING_DIR}/DEBIAN"
chmod -R ugo+rX "${STAGING_DIR}"

# 4. Copy Binaries
if [ -f "${ROOT_DIR}/target/release/lunanano-compositor" ]; then
    cp "${ROOT_DIR}/target/release/lunanano-compositor" "${STAGING_DIR}/usr/bin/"
    chmod 755 "${STAGING_DIR}/usr/bin/lunanano-compositor"
fi

cp "${SCRIPT_DIR}/lunanano-standalone-runner" "${STAGING_DIR}/usr/share/lunanano/"
chmod 755 "${STAGING_DIR}/usr/share/lunanano/lunanano-standalone-runner"

if [ -f "${ROOT_DIR}/target/release/lunanano-shell" ]; then
    cp "${ROOT_DIR}/target/release/lunanano-shell" "${STAGING_DIR}/usr/bin/"
    chmod 755 "${STAGING_DIR}/usr/bin/lunanano-shell"
else
    # Link standalone runner as lunanano-shell if native Tauri binary not compiled on this host
    ln -sf /usr/share/lunanano/lunanano-standalone-runner "${STAGING_DIR}/usr/bin/lunanano-shell"
fi

# Session launcher
cp "${SCRIPT_DIR}/lunanano-session" "${STAGING_DIR}/usr/bin/"
chmod 755 "${STAGING_DIR}/usr/bin/lunanano-session"

# 5. Copy Frontend Dist
if [ -d "${ROOT_DIR}/dist" ]; then
    cp -r "${ROOT_DIR}/dist/"* "${STAGING_DIR}/usr/share/lunanano/dist/"
fi

# 6. Copy Desktop and Icon files
cp "${SCRIPT_DIR}/lunanano.desktop" "${STAGING_DIR}/usr/share/wayland-sessions/"
cp "${SCRIPT_DIR}/lunanano.desktop" "${STAGING_DIR}/usr/share/applications/"
cp "${SCRIPT_DIR}/lunanano.svg" "${STAGING_DIR}/usr/share/icons/hicolor/scalable/apps/"
cp "${SCRIPT_DIR}/greetd-lunanano.conf" "${STAGING_DIR}/etc/greetd/lunanano.conf"

# 7. Ensure standard Debian permissions
find "${STAGING_DIR}" -type d -exec chmod 755 {} +
find "${STAGING_DIR}" -type f -exec chmod 644 {} +
chmod 755 "${STAGING_DIR}/DEBIAN/postinst"
chmod 755 "${STAGING_DIR}/usr/bin/"* 2>/dev/null || true

# 8. Package with dpkg-deb
DEB_NAME="lunanano_${VERSION}_${ARCH}.deb"
dpkg-deb --build --root-owner-group "${STAGING_DIR}" "${OUTPUT_DIR}/${DEB_NAME}"

echo "Created package: ${OUTPUT_DIR}/${DEB_NAME}"
ls -lh "${OUTPUT_DIR}/${DEB_NAME}"
