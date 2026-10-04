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

BIN_DIR="${ROOT_DIR}/target/release"
if [ -n "$RUST_TARGET" ] && [ -d "${ROOT_DIR}/target/${RUST_TARGET}/release" ]; then
    BIN_DIR="${ROOT_DIR}/target/${RUST_TARGET}/release"
fi

OUTPUT_DIR="${ROOT_DIR}/artifacts"
TARBALL_DIR="${ROOT_DIR}/target/lunanano-${VERSION}-${ARCH}"
mkdir -p "${OUTPUT_DIR}"

echo "Building LunaNano portable tarball v${VERSION} (${ARCH})..."

rm -rf "${TARBALL_DIR}"
mkdir -p "${TARBALL_DIR}/bin"
mkdir -p "${TARBALL_DIR}/share/lunanano/dist"
mkdir -p "${TARBALL_DIR}/share/wayland-sessions"
mkdir -p "${TARBALL_DIR}/share/applications"
mkdir -p "${TARBALL_DIR}/share/icons/hicolor/scalable/apps"
mkdir -p "${TARBALL_DIR}/etc/greetd"

# Copy compositor binary
if [ -f "${BIN_DIR}/lunanano-compositor" ]; then
    cp "${BIN_DIR}/lunanano-compositor" "${TARBALL_DIR}/bin/"
    chmod 755 "${TARBALL_DIR}/bin/lunanano-compositor"
fi

# Copy shell binary or standalone runner
cp "${SCRIPT_DIR}/lunanano-standalone-runner" "${TARBALL_DIR}/share/lunanano/"
chmod 755 "${TARBALL_DIR}/share/lunanano/lunanano-standalone-runner"

if [ -f "${BIN_DIR}/lunanano-shell" ]; then
    cp "${BIN_DIR}/lunanano-shell" "${TARBALL_DIR}/bin/"
    chmod 755 "${TARBALL_DIR}/bin/lunanano-shell"
else
    ln -sf /usr/share/lunanano/lunanano-standalone-runner "${TARBALL_DIR}/bin/lunanano-shell"
fi

# Copy session launcher
cp "${SCRIPT_DIR}/lunanano-session" "${TARBALL_DIR}/bin/"
chmod 755 "${TARBALL_DIR}/bin/lunanano-session"

# Copy frontend dist
if [ -d "${ROOT_DIR}/dist" ]; then
    cp -r "${ROOT_DIR}/dist/"* "${TARBALL_DIR}/share/lunanano/dist/"
fi

# Copy desktop and session assets
cp "${SCRIPT_DIR}/lunanano.desktop" "${TARBALL_DIR}/share/wayland-sessions/"
cp "${SCRIPT_DIR}/lunanano.desktop" "${TARBALL_DIR}/share/applications/"
cp "${SCRIPT_DIR}/lunanano.svg" "${TARBALL_DIR}/share/icons/hicolor/scalable/apps/"
cp "${SCRIPT_DIR}/greetd-lunanano.conf" "${TARBALL_DIR}/etc/greetd/lunanano.conf"

# Copy LICENSE and README
cp "${ROOT_DIR}/LICENSE" "${TARBALL_DIR}/"
cp "${ROOT_DIR}/README.md" "${TARBALL_DIR}/"
cp "${ROOT_DIR}/README_RU.md" "${TARBALL_DIR}/"

# Generate install.sh
cat <<'EOF' > "${TARBALL_DIR}/install.sh"
#!/usr/bin/env bash
set -e

PREFIX="${PREFIX:-/usr}"
DESTDIR="${DESTDIR:-}"

INSTALL_DIR="${DESTDIR}${PREFIX}"

echo "Installing LunaNano to ${INSTALL_DIR}..."

mkdir -p "${INSTALL_DIR}/bin"
mkdir -p "${INSTALL_DIR}/share/lunanano"
mkdir -p "${INSTALL_DIR}/share/wayland-sessions"
mkdir -p "${INSTALL_DIR}/share/applications"
mkdir -p "${INSTALL_DIR}/share/icons/hicolor/scalable/apps"
mkdir -p "${DESTDIR}/etc/greetd"

cp -rf bin/* "${INSTALL_DIR}/bin/"
cp -rf share/lunanano/* "${INSTALL_DIR}/share/lunanano/"
cp -f share/wayland-sessions/* "${INSTALL_DIR}/share/wayland-sessions/"
cp -f share/applications/* "${INSTALL_DIR}/share/applications/"
cp -f share/icons/hicolor/scalable/apps/* "${INSTALL_DIR}/share/icons/hicolor/scalable/apps/"
cp -f etc/greetd/* "${DESTDIR}/etc/greetd/" 2>/dev/null || true

chmod +x "${INSTALL_DIR}/bin/lunanano-session"
chmod +x "${INSTALL_DIR}/bin/lunanano-compositor" 2>/dev/null || true
chmod +x "${INSTALL_DIR}/share/lunanano/lunanano-standalone-runner"

# Update desktop and icon databases
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database -q "${INSTALL_DIR}/share/applications" 2>/dev/null || true
command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -q -t -f "${INSTALL_DIR}/share/icons/hicolor" 2>/dev/null || true

echo "LunaNano installed successfully! Run 'lunanano-session' or select LunaNano at login."
EOF
chmod 755 "${TARBALL_DIR}/install.sh"

# Generate uninstall.sh
cat <<'EOF' > "${TARBALL_DIR}/uninstall.sh"
#!/usr/bin/env bash
set -e

PREFIX="${PREFIX:-/usr}"
DESTDIR="${DESTDIR:-}"

INSTALL_DIR="${DESTDIR}${PREFIX}"

echo "Uninstalling LunaNano from ${INSTALL_DIR}..."

rm -f "${INSTALL_DIR}/bin/lunanano-session"
rm -f "${INSTALL_DIR}/bin/lunanano-compositor"
rm -f "${INSTALL_DIR}/bin/lunanano-shell"
rm -rf "${INSTALL_DIR}/share/lunanano"
rm -f "${INSTALL_DIR}/share/wayland-sessions/lunanano.desktop"
rm -f "${INSTALL_DIR}/share/applications/lunanano.desktop"
rm -f "${INSTALL_DIR}/share/icons/hicolor/scalable/apps/lunanano.svg"

command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database -q "${INSTALL_DIR}/share/applications" 2>/dev/null || true
command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -q -t -f "${INSTALL_DIR}/share/icons/hicolor" 2>/dev/null || true

echo "LunaNano uninstalled successfully."
EOF
chmod 755 "${TARBALL_DIR}/uninstall.sh"

# Archive into tar.gz
ARCHIVE_NAME="lunanano-${VERSION}-linux-${ARCH}.tar.gz"
tar -czf "${OUTPUT_DIR}/${ARCHIVE_NAME}" -C "${ROOT_DIR}/target" "lunanano-${VERSION}-${ARCH}"

echo "Created generic tarball: ${OUTPUT_DIR}/${ARCHIVE_NAME}"
ls -lh "${OUTPUT_DIR}/${ARCHIVE_NAME}"
