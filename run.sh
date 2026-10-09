#!/bin/bash

# LINUX: Para auto-formatar o código no VS Code, use CTRL+SHIFT+I.
# No terminal, para formatar um arquivo bash, você pode usar shfmt.
# Exemplo de instalação no Arch Linux: sudo pacman -S shfmt
# Exemplo de uso: shfmt -w seu_script.sh
# TypeScript React FORMATTER 'Prettier'

clear_screen() {
	printf "\033[2J\033[H" # Limpa a tela e move o cursor para o topo
}

npxcheckversions() {
	npx expo install --check
	sleep 3
}

update_sdk(){
	rm -rf node_modules package-lock.json yarn.lock
	npm install expo@~57.0.0 --legacy-peer-deps
	npx expo install --fix
	npx expo config
	npx expo-doctor
	npx expo start -c
}

local_build_req(){
	sudo pacman -S jdk17-openjdk
	sudo archlinux-java set java-17-openjdk
	yay -S android-studio
}

remove_node_modules_folder(){
	rm -rf node_modules package-lock.json
}

install_dependencies(){
	npx expo install --fix
}

install_dependencies_old() {
	echo ""
	echo "Instalando dependências do Expo..."
	# Certifique-se de estar na pasta raiz do seu projeto Expo
	npx expo install expo-sqlite@latest \
		react-native-paper@latest \
		react-native-async-storage/async-storage@latest \
		expo-sharing@latest \
		expo-file-system@latest \
		expo-document-picker@latest \
		expo-notifications@latest \
		@react-native-picker/picker@latest \
		expo-router@latest \
		@react-navigation/native@latest \
		zustand@latest \
		expo-clipboard@latest \
		expo-print@latest \
		expo-linear-gradient@latest \
		expo-camera@latest \
		expo-doctor@latest
	echo "Dependências instaladas."
	echo -n "Pressione ENTER para continuar..."
	read -r
}

install_dependencies_old_2() {
	echo ""
	echo "Instalando dependências do Expo (SDK 54)..."

	# Removido o @latest para deixar o Expo escolher a versão compatível
	# Adicionado o -- --legacy-peer-deps para evitar erros de tipagem do React 19
	npx expo install \
		expo-sqlite \
		react-native-paper \
		@react-native-async-storage/async-storage \
		react-native-worklets \
		expo-sharing \
		expo-file-system \
		expo-document-picker \
		expo-notifications \
		@react-native-picker/picker \
		expo-router \
		@react-navigation/native \
		zustand \
		expo-clipboard \
		expo-print \
		expo-linear-gradient \
		expo-camera \
		expo-doctor \
		expo-constants \
		expo-localization \
		i18next \
		react-i18next \
		-- --legacy-peer-deps

	echo "Dependências instaladas com sucesso."
	echo -n "Pressione ENTER para continuar..."
	read -r
}

run_project() {
	echo ""
	echo "Rodando o projeto Expo (npx expo start)..."
	npx expo start
	echo "Press Enter to exit ..."
	read saindoagora
	# O comando npx expo start vai abrir o Metro Bundler no terminal e no navegador.
	# Para voltar ao menu depois de parar o servidor (CTRL+C), o script precisa continuar.
	# Dependendo de como você parar o servidor, pode ser necessário rodar o script novamente.
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
		echo "Por favor, faça login para continuar com o build."
		echo ""
		npx expo login
		local login_again_status
		login_again_status=$(npx expo whoami 2>&1)
		local login_again_exit_code=$?
		if [ "$login_again_exit_code" -eq 0 ] && [[ "$login_again_status" != *"Not logged in"* ]]; then
			echo "Login realizado com sucesso."
			return 0
		else
			echo "Não foi possível fazer o login. O build não será iniciado."
			return 1
		fi
	fi
}

build_apk() {
	echo ""
	echo "Iniciando o processo de build do APK com EAS Build..."

	if ! check_expo_login; then
		echo -n "Pressione ENTER para continuar..."
		read -r
		return
	fi

	echo ""
	echo "Configurando EAS Update (se ainda não estiver configurado)..."
	npx eas-cli@latest update:configure

	echo ""
	echo "Iniciando o build do APK (profile preview)..."
	echo "Isso pode levar um tempo. Você receberá um link para baixar o APK ao final."
	npx eas-cli@latest build -p android --profile preview --clear-cache

	echo ""
	echo "Lembrete: O arquivo eas.json deve estar na pasta raiz do seu projeto Expo."
	echo -n "Pressione ENTER para continuar..."
	read -r
}

change_slug_id(){
	npx eas-cli project:init
}

build_apk_local() {
    echo ""
    echo "Iniciando o processo de build LOCAL do APK com EAS Build..."

    # Garante que as variáveis do Android SDK estejam carregadas na sessão
    if [ -z "$ANDROID_HOME" ]; then
        export ANDROID_HOME=$HOME/Android/Sdk
        export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin
    fi

    # Verifica se o eas.json existe
    if [ ! -f "eas.json" ]; then
        echo "Erro: O arquivo eas.json não foi encontrado na pasta raiz do projeto."
        echo -n "Pressione ENTER para continuar..."
        read -r
        return 1
    fi

    echo ""
    echo "Iniciando o build local do APK (profile preview)..."
    echo "Isso utilizará os recursos e o SDK Android da sua máquina local."
    echo "Pode levar alguns minutos na primeira execução para compilar as dependências Gradle..."
    echo ""

    npx eas-cli@latest build -p android --profile preview --local

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Build concluído com sucesso!"
        echo "O arquivo .apk foi gerado no diretório atual."
    else
        echo ""
        echo "❌ Ocorreu um erro durante o build local."
        echo "Certifique-se de que o Android SDK, Java 17 e o NDK estejam instalados e configurados."
    fi

    echo ""
    echo -n "Pressione ENTER para continuar..."
    read -r
}

# --- NOVA FUNÇÃO PARA EXPO DOCTOR ---
run_expo_doctor() {
	echo ""
	echo "Verificando a saúde do seu projeto Expo e ambiente de desenvolvimento..."
	echo "Isso pode identificar e sugerir soluções para problemas comuns."
	npx expo-doctor
	echo ""
	echo -n "Pressione ENTER para continuar..."
	read -r
}
# --- FIM DA NOVA FUNÇÃO ---

open_vscode() {
	echo ""
	echo "Abrindo o projeto no VS Code (code .)..."
	code . &
}

show_menu() {
	clear_screen
	echo "-------------------------------------"
	echo "  Gerenciador de Projeto Expo Go"
	echo "-------------------------------------"
	echo "1. Rodar o Projeto (npx expo start)"
	echo "2. Abrir Pasta no VS Code (code .)"
	echo "-------------------------------------"
	echo "3. Instalar Dependências (npx expo install --fix)"
	echo "4. Verificar Saúde do Projeto (npx expo doctor)"
	echo "5. Check versão das dependencias (npx expo install --check)"
	echo "6. Update SDK (SDK 57)"
	echo "8. Setup Android Studio"
	echo "-------------------------------------"
	echo "7. Buildar APK (EAS Build)"
	echo "9. Buildar APK Local (EAS Build)"
	echo "-------------------------------------"
	echo "0. Sair"
	echo "-------------------------------------"
	echo -n "Escolha uma opção: "
}

# Loop principal do menu
while true; do
	show_menu
	read -r choice
	case "$choice" in
	1) run_project ;;
	3) install_dependencies ;;
	7) build_apk ;;
	9) build_apk_local ;;
	4) run_expo_doctor ;; # Chama a nova função
	2) open_vscode ;;
	5) npxcheckversions ;;
	6) update_sdk ;;
	8) local_build_req ;;
	0)
		echo ""
		echo "Saindo. Até mais!"
		exit 0
		;;
	*)
		echo ""
		echo "Opção inválida. Por favor, escolha um número válido."
		echo -n "Pressione ENTER para continuar..."
		read -r
		;;
	esac
done
