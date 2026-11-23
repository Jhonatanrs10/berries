#!/bin/bash
sdk_version="58.0.0"
nodejs_version="nodejs-lts-jod" # version 22
#https://wiki.archlinux.org/title/Node.js

pause() {
	echo ""
	echo -n "Pressione ENTER para continuar..."
	read -r
}

clear_screen() {
	printf "\033[2J\033[H"
}

npxcheckversions() {
	echo ""
	echo "Checando compatibilidade de versões..."
	npx expo install --check
	pause
}

update_package_lock() {
	echo ""
	echo "Atualizando package-lock.json..."
	npm install --legacy-peer-deps
	pause
}

repair_project() {
	echo ""
	echo "🔧 Reparando projeto (limpeza + reinstalação + alinhamento Expo)..."
	echo "Node atual: $(node -v 2>/dev/null || echo 'não encontrado') | npm atual: $(npm -v 2>/dev/null || echo 'não encontrado')"
	echo ""
	echo -n "Apagar node_modules e package-lock.json antes de reinstalar? [S/n]: "
	read -r clean_ans

	if [[ ! "${clean_ans,,}" =~ ^(n|nao|não)$ ]]; then
		rm -rf node_modules package-lock.json yarn.lock
		echo "Árvore antiga removida."
	fi

	echo ""
	echo "1/3 Instalando dependências (npm install --legacy-peer-deps)..."
	if ! npm install --legacy-peer-deps; then
		echo "❌ Falha no npm install. Verifique a versão do Node.js (ex.: Node 22 LTS)."
		pause
		return 1
	fi

	echo ""
	echo "2/3 Alinhando pacotes com o SDK do Expo..."
	npx expo install --fix -- --legacy-peer-deps

	echo ""
	echo "3/3 Rodando diagnóstico (npx expo-doctor)..."
	npx expo-doctor

	pause
}

update_sdk() {
	echo ""
	echo -e "Atualizando para Expo SDK $sdk_version (Node: $(node -v 2>/dev/null || echo '?'))\nhttps://wiki.archlinux.org/title/Node.js"
	echo -n "Limpar node_modules e lockfiles antes de atualizar para o SDK $sdk_version? [S/n]: "
	read -r clean_sdk

	if [[ ! "${clean_sdk,,}" =~ ^(n|nao|não)$ ]]; then
		rm -rf node_modules package-lock.json yarn.lock
	fi

	npm install --legacy-peer-deps
	npx expo install "expo@^$sdk_version" "expo-router@^$sdk_version" -- --legacy-peer-deps
	npx expo install --fix -- --legacy-peer-deps
	npx expo config
	npx expo-doctor
	pause
	npx expo start -c
}

rm_configs() {
	echo ""
	echo "AVISO: Isso vai apagar node_modules, package-lock.json e yarn.lock."
	echo "Após apagar, você deve rodar 'npm install expo' (e alinhar dependências) antes de usar o projeto."
	echo -n "Deseja realmente continuar? [s/N]: "
	read -r confirm

	case "${confirm,,}" in
	s | sim | y | yes)
		rm -rf node_modules package-lock.json yarn.lock
		echo "Arquivos e pastas removidos. Lembre-se de rodar 'npm install expo' em seguida."
		;;
	*)
		echo "Operação cancelada."
		;;
	esac
	pause
}

install_expo() {
	echo ""
	echo "Node atual antes da instalação: $(node -v 2>/dev/null || echo 'nenhum')"
	sudo pacman -S "$nodejs_version" npm --needed
	hash -r
	echo "Node ativo após pacman: $(node -v 2>/dev/null || echo 'nenhum')"
	npm install expo --legacy-peer-deps
	pause
}

local_build_req() {
	echo ""
	echo "Instalando dependências nativas para Arch Linux..."
	sudo pacman -S --needed jdk17-openjdk
	sudo archlinux-java set java-17-openjdk
	yay -S --needed android-studio
	pause
}

install_dependencies() {
	echo ""
	echo "Corrigindo e alinhando dependências..."
	npx expo install --fix -- --legacy-peer-deps
	pause
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
		pause
		return
	fi

	npx eas-cli@latest update:configure
	npx eas-cli@latest build -p android --profile preview --clear-cache

	pause
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
		pause
		return 1
	fi

	npx eas-cli@latest build -p android --profile preview --local

	if [ $? -eq 0 ]; then
		echo "✅ Build local concluído com sucesso!"
	else
		echo "❌ Erro no build local."
	fi

	pause
}

run_expo_doctor() {
	echo ""
	echo "Rodando diagnóstico de saúde do projeto..."
	npx expo-doctor
	pause
}

open_vscode() {
	echo ""
	echo "Abrindo VS Code..."
	code . &
}

git_pull() {
	echo ""
	echo "🔄 Puxando atualizações do repositório remoto (git pull)..."
	git pull
	pause
}

git_push() {
	echo ""
	echo "🚀 Enviando alterações para o repositório (git push)..."

	git status
	echo ""
	echo -n "Digite a mensagem do commit: "
	read -r commit_msg

	if [ -z "$commit_msg" ]; then
		commit_msg="att"
	fi

	git add .
	git commit -m "$commit_msg"
	git push

	pause
}

OPCOES=(
	"Rodar o Projeto (npx expo start)|run_project"
	"Abrir Pasta no VS Code (code .)|open_vscode"
	"---"
	"Expo Setup (pacman + npm install expo)|install_expo"
	"Reparar Projeto (Limpar + Instalar + Fix + Doctor)|repair_project"
	"Limpar node_modules e lockfiles|rm_configs"
	"Corrigir Dependências (npx expo install --fix)|install_dependencies"
	"Verificar Saúde do Projeto (npx expo-doctor)|run_expo_doctor"
	"Checar Compatibilidade (npx expo install --check)|npxcheckversions"
	"Atualizar package-lock.json (npm install)|update_package_lock"
	"Atualizar para Expo SDK \$sdk_version|update_sdk"
	"---"
	"Instalar Requisitos do Android Studio (Arch)|local_build_req"
	"Buildar APK em Nuvem (EAS Build)|build_apk"
	"Buildar APK Localmente (EAS Local)|build_apk_local"
	"---"
	"Git Pull|git_pull"
	"Git Push|git_push"
)

show_menu() {
	clear_screen
	echo "-------------------------------------"
	echo "  Gerenciador de Projeto Expo Go"
	echo "-------------------------------------"

	local num=1
	for item in "${OPCOES[@]}"; do
		if [[ "$item" == "---" ]]; then
			echo "-------------------------------------"
		else
			local rotulo="${item%%|*}"
			rotulo="${rotulo//\$sdk_version/$sdk_version}"
			printf "%d.  %s\n" "$num" "$rotulo"
			((num++))
		fi
	done

	echo "-------------------------------------"
	echo "0. Sair"
	echo "-------------------------------------"
	echo -n "Escolha uma opção: "
}

expo_menu() {
	while true; do
		show_menu
		read -r choice

		if [[ "$choice" == "0" ]]; then
			echo ""
			echo "Saindo. Até mais!"
			exit 0
		fi

		local -a funcoes=()
		for item in "${OPCOES[@]}"; do
			if [[ "$item" != "---" ]]; then
				funcoes+=("${item##*|}")
			fi
		done

		if [[ "$choice" =~ ^[0-9]+$ ]] && (( choice >= 1 && choice <= ${#funcoes[@]} )); then
			"${funcoes[$((choice - 1))]}"
		else
			echo ""
			echo "Opção inválida."
			pause
		fi
	done
}

expo_menu