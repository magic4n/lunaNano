Name:           lunanano
Version:        0.1.0
Release:        1%{?dist}
Summary:        LunaNano Wayland Desktop Shell
License:        GPL-3.0-or-later
URL:            https://github.com/superluna/lunaNano

Requires:       pipewire, wireplumber, brightnessctl, NetworkManager, bluez, power-profiles-daemon, wl-clipboard, grim, slurp, xorg-x11-server-Xwayland, gtk3

%description
LunaNano is an ultra-lightweight, aesthetic Wayland desktop shell
built with React, TypeScript, Material You 3, and a high-performance
Rust compositor with native XWayland support.

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}/usr/bin
mkdir -p %{buildroot}/usr/share/lunanano/dist
mkdir -p %{buildroot}/usr/share/wayland-sessions
mkdir -p %{buildroot}/usr/share/applications
mkdir -p %{buildroot}/usr/share/icons/hicolor/scalable/apps
mkdir -p %{buildroot}/etc/greetd

cp -rf %{_sourcedir}/bin/* %{buildroot}/usr/bin/
cp -rf %{_sourcedir}/share/lunanano/* %{buildroot}/usr/share/lunanano/
cp -f %{_sourcedir}/share/wayland-sessions/* %{buildroot}/usr/share/wayland-sessions/
cp -f %{_sourcedir}/share/applications/* %{buildroot}/usr/share/applications/
cp -f %{_sourcedir}/share/icons/hicolor/scalable/apps/* %{buildroot}/usr/share/icons/hicolor/scalable/apps/
cp -f %{_sourcedir}/etc/greetd/* %{buildroot}/etc/greetd/ 2>/dev/null || true

%files
/usr/bin/lunanano-session
/usr/bin/lunanano-compositor
/usr/bin/lunanano-shell
/usr/share/lunanano
/usr/share/wayland-sessions/lunanano.desktop
/usr/share/applications/lunanano.desktop
/usr/share/icons/hicolor/scalable/apps/lunanano.svg
/etc/greetd/lunanano.conf

%post
update-desktop-database &> /dev/null || :
touch --no-create %{_datadir}/icons/hicolor &>/dev/null || :

%postun
update-desktop-database &> /dev/null || :
touch --no-create %{_datadir}/icons/hicolor &>/dev/null || :
