#!/bin/bash

clear_screen() {
	printf "\033[2J\033[H"
}

npxcheckversions() {
	echo ""
	echo "Checando compatibilidade de versões..."
	npx expo install --check
	echo ""
	echo -n "Pressione ENTER para continuar..."
	read -r
}

update_package_lock() {
	echo ""
	echo "Atualizando package-lock.json..."
	npm install
	echo ""
	echo -n "Pressione ENTER para continuar..."
	read -r
}

update_sdk() {
	echo ""
	echo "Atualizando Expo SDK e dependências..."
	rm -rf node_modules package-lock.json yarn.lock
	npx expo install expo@latest -- --legacy-peer-deps
	npx expo install --fix
	npx expo config
	npx expo doctor
	npx expo start -c
}

local_build_req() {
	echo ""
	echo "Instalando dependências nativas para Arch Linux..."
	sudo pacman -S --needed jdk17-openjdk
	sudo archlinux-java set java-17-openjdk
	yay -S --needed android-studio
	echo -n "Pressione ENTER para continuar..."
	read -r
}

install_dependencies() {
	echo ""
	echo "Corrigindo e alinhando dependências..."
	npx expo install --fix
	echo -n "Pressione ENTER para continuar..."
	read -r
}

run_project() {
	echo ""
	echo "Iniciando servidor Metro (Expo)..."
	npx expo start
}

check_expo_login() {
	echo "Verificando status do login no Expo..."
	local login_status
	login_status=$(npx expo whoami 2>&1)
	local exit_code=$?

	if [ "$exit_code" -eq 0 ] && [[ "$login_status" != *"Not logged in"* ]]; then
		echo "Você está logado como: $login_status"
		return 0
	else
		echo "Você não está logado no Expo."
		npx expo login
		return $?
	fi
}

build_apk() {
	echo ""
	echo "Iniciando build na nuvem (EAS)..."

	if ! check_expo_login; then
		echo -n "Pressione ENTER para continuar..."
		read -r
		return
	fi

	npx eas-cli@latest update:configure
	npx eas-cli@latest build -p android --profile preview --clear-cache

	echo -n "Pressione ENTER para continuar..."
	read -r
}

build_apk_local() {
	echo ""
	echo "Iniciando build LOCAL do APK..."

	if [ -z "$ANDROID_HOME" ]; then
		export ANDROID_HOME=$HOME/Android/Sdk
		export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin
	fi

	if [ ! -f "eas.json" ]; then
		echo "Erro: O arquivo eas.json não foi encontrado."
		echo -n "Pressione ENTER para continuar..."
		read -r
		return 1
	fi

	npx eas-cli@latest build -p android --profile preview --local

	if [ $? -eq 0 ]; then
		echo "✅ Build local concluído com sucesso!"
	else
		echo "❌ Erro no build local."
	fi

	echo -n "Pressione ENTER para continuar..."
	read -r
}

run_expo_doctor() {
	echo ""
	echo "Rodando diagnóstico de saúde do projeto..."
	npx expo doctor
	echo ""
	echo -n "Pressione ENTER para continuar..."
	read -r
}

open_vscode() {
	echo ""
	echo "Abrindo VS Code..."
	code . &
}

show_menu() {
	clear_screen
	echo "-------------------------------------"
	echo "  Gerenciador de Projeto Expo Go"
	echo "-------------------------------------"
	echo "1.  Rodar o Projeto (npx expo start)"
	echo "2.  Abrir Pasta no VS Code (code .)"
	echo "-------------------------------------"
	echo "3.  Corrigir Dependências (expo install --fix)"
	echo "4.  Verificar Saúde do Projeto (expo doctor)"
	echo "5.  Checar Compatibilidade (expo install --check)"
	echo "6.  Atualizar package-lock.json (npm install)"
	echo "7.  Atualizar Expo SDK"
	echo "-------------------------------------"
	echo "8.  Instalar Requisitos do Android Studio (Arch)"
	echo "9.  Buildar APK em Nuvem (EAS Build)"
	echo "10. Buildar APK Localmente (EAS Local)"
	echo "-------------------------------------"
	echo "0. Sair"
	echo "-------------------------------------"
	echo -n "Escolha uma opção: "
}

while true; do
	show_menu
	read -r choice
	case "$choice" in
	1) run_project ;;
	2) open_vscode ;;
	3) install_dependencies ;;
	4) run_expo_doctor ;;
	5) npxcheckversions ;;
	6) update_package_lock ;;
	7) update_sdk ;;
	8) local_build_req ;;
	9) build_apk ;;
	10) build_apk_local ;;
	0)
		echo ""
		echo "Saindo. Até mais!"
		exit 0
		;;
	*)
		echo ""
		echo "Opção inválida."
		echo -n "Pressione ENTER para continuar..."
		read -r
		;;
	esac
done