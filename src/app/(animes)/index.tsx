import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useCallback } from 'react';
import ButtonTT from '../../components/Jhonatanrs/ButtonTT';
import {
  Button,
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Linking,
  Platform,
  FlatList, // Importando FlatList
} from 'react-native';
import { Text, View } from '../../components/Themed';
import { ThemedInput } from '../../components/ThemedInput'; // Se não estiver em uso, pode remover
import { ThemedPicker } from '../../components/ThemedPicker'; // Se não estiver em uso, pode remover
import { buscarAnimes, deletarAnime } from '../../database/db';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import { FontAwesome } from '@expo/vector-icons';

type StatusAnime = 'watching' | 'completed' | 'plan_to_watch';
type ReleaseDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface Anime {
  id: number;
  nome: string;
  status: StatusAnime;
  release_day: ReleaseDay | null;
  observacao: string | null;
  link: string | null;
  seasons: string | null;
}

// --- Componente separado para renderizar cada item de Anime ---
interface AnimeItemProps {
  anime: Anime;
  colors: typeof Colors['light']; // Tipagem para as cores do tema
  abrirLink: (url: string | null) => void;
  editarAnime: (anime: Anime) => void;
  confirmarExclusao: (id: number) => void;
}

const AnimeItem: React.FC<AnimeItemProps> = ({ anime, colors, abrirLink, editarAnime, confirmarExclusao }) => {
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.animeContainer,
        {
          backgroundColor: colors.inputBackground,
          borderColor: colors.borderColor,
          borderWidth: 1,
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }
      ]}
    >
      <View style={[styles.animeHeader, { backgroundColor: colors.inputBackground }]}>
        <View style={[styles.animeInfoPrincipal, { backgroundColor: colors.inputBackground }]}>
          <Text style={[styles.animeNome, { color: colors.text }]}>
            {anime.nome}
          </Text>
          <Text style={[
            styles.animeStatus,
            {
              color: anime.status === 'watching' ? colors.info :
                anime.status === 'completed' ? colors.success :
                  colors.warning2, // Cor para plan_to_watch
              backgroundColor: anime.status === 'watching' ? `${colors.info}20` :
                anime.status === 'completed' ? `${colors.success}20` :
                  `${colors.warning2}20`,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
              overflow: 'hidden'
            }
          ]}>
            {anime.status === 'watching'
              ? t('status.watching')
              : anime.status === 'completed'
                ? t('status.completed')
                : t('status.plan_to_watch')}
          </Text>
        </View>
      </View>

      <View style={[styles.animeDetalhes, { borderTopColor: colors.borderColor, backgroundColor: colors.inputBackground }]}>
        {anime.release_day && (
          <View style={[styles.detalheItem, { backgroundColor: colors.inputBackground }]}>
            <Text style={[styles.detalheLabel, { color: colors.text }]}>{t('item.release')}:</Text>
            <Text style={[styles.detalheValor, { color: colors.text }]}>
              {t(`release.${anime.release_day}`)}
            </Text>
          </View>
        )}
        {anime.seasons && (
          <View style={[styles.detalheItem, { backgroundColor: colors.inputBackground, flexDirection: 'row', justifyContent: 'space-between', flexShrink: 1 }]}>
            <Text style={[styles.detalheLabel, { color: colors.text }]}>{t('item.episodes')}:</Text>
            <Text style={[styles.detalheValor, { color: colors.text, flexShrink: 1, marginStart: 10 }]}>
              {(() => {
                if (!anime.seasons || anime.seasons.trim() === '') {
                  return 'N/A';
                }

                try {
                  const parsedSeasons = JSON.parse(anime.seasons);

                  if (Array.isArray(parsedSeasons) && parsedSeasons.length > 0) {

                    // 1. Converte e filtra apenas números inteiros válidos
                    const episodiosPorTemporada = parsedSeasons
                      .map(Number)
                      .filter(n => Number.isInteger(n) && n >= 0);

                    // 2. Cria a string das temporadas separadas por vírgula
                    const temporadasSeparadas = episodiosPorTemporada.join(', ');

                    // 3. Verifica a condição: Só mostra a soma se houver mais de 1 elemento na lista
                    if (episodiosPorTemporada.length > 1) {

                      // 4. Soma todos os episódios (somente se a condição for satisfeita)
                      const somaTotalEpisodios = episodiosPorTemporada.reduce((acumulador, valorAtual) => acumulador + valorAtual, 0);

                      // Retorna com a soma
                      return `${temporadasSeparadas} (${somaTotalEpisodios})`;
                    }

                    // Retorna SEM a soma (para 1 temporada)
                    return temporadasSeparadas;

                  } else if (Array.isArray(parsedSeasons) && parsedSeasons.length === 0) {
                    return t('return.none');
                  } else {
                    return t('return.invalid_format');
                  }
                } catch (e) {
                  console.error("Error to process seasons:", e, anime.seasons);
                  return t('return.error');
                }
              })()}
            </Text>
          </View>
        )}
        {anime.observacao && (
          <View style={[styles.detalheItem, { backgroundColor: colors.inputBackground }]}>
            <Text style={[styles.detalheLabel, { color: colors.text }]}>{t('item.obs')}: </Text>
            <Text style={[styles.detalheValor, { color: colors.text, flex: 1, flexWrap: 'wrap' }]}>{anime.observacao}</Text>
          </View>
        )}
      </View>

      <View style={[styles.animeAcoes, { borderTopColor: colors.borderColor, backgroundColor: colors.inputBackground }]}>
        <ButtonTT
          title={t('button.watch')}
          onPress={() => abrirLink(anime.link)}
          onLongPress={() => abrirLink(`https://www.google.com/search?q=${t('search.watch')}+${anime.nome}`)}
          color={colors.info}
        />
        <ButtonTT
          title={t('button.about')}
          onPress={() => abrirLink("https://myanimelist.net/search/all?q=" + anime.nome)}
          onLongPress={() => abrirLink("https://anilist.co/search/anime?search=" + anime.nome)}
          color={colors.info}
        />
        <ButtonTT
          title={t('button.edit')}
          onPress={() => editarAnime(anime)}
          color={colors.info}
        />

        <ButtonTT
          title="X"
          onLongPress={() => confirmarExclusao(anime.id)}
          color="error"
        />
      </View>
    </View>
  );
};
// --- Fim do componente AnimeItem ---

const dayOrder: { [key: string]: number } = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
};

// Mapeia o índice do JavaScript (0 = domingo, 1 = segunda, ...) para o seu tipo ReleaseDay
const getTodayReleaseDay = (): ReleaseDay => {
  const days: ReleaseDay[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  const todayIndex = new Date().getDay(); // Retorna de 0 (Domingo) a 6 (Sábado)
  return days[todayIndex];
};

export default function MeusAnimes() {
  const { t } = useTranslation();

  const [animes, setAnimes] = useState<Anime[]>([]);
  const [busca, setBusca] = useState('');

  const [selectedDayFilter, setSelectedDayFilter] = useState<ReleaseDay | 'all' | 'plan_to_watch' | null>(getTodayReleaseDay());

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const daysOfWeek: { label: string; value: ReleaseDay | 'all' }[] = [
    { label: t('release.all'), value: 'all' },
    { label: t('release.sunday_ab'), value: 'sunday' },
    { label: t('release.monday_ab'), value: 'monday' },
    { label: t('release.tuesday_ab'), value: 'tuesday' },
    { label: t('release.wednesday_ab'), value: 'wednesday' },
    { label: t('release.thursday_ab'), value: 'thursday' },
    { label: t('release.friday_ab'), value: 'friday' },
    { label: t('release.saturday_ab'), value: 'saturday' },
    { label: '🔗', value: 'plan_to_watch' as const }
  ];

  async function carregarAnimes() {
    try {
      const resultado = await buscarAnimes() as Anime[];
      setAnimes(resultado);
    } catch (error) {
      console.error('Error to load animes:', error);
      Alert.alert(t('return.error'), t('return.no_anime_found'));
    }
  }

  useFocusEffect(
    useCallback(() => {
      carregarAnimes();
    }, [])
  );

  const confirmarExclusao = useCallback(async (id: number) => {
    Alert.alert(
      t('return.confirm_delete'),
      t('return.confirm_delete_anime'),
      [
        { text: t('button.cancel'), style: 'cancel' },
        {
          text: t('button.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deletarAnime(id);
              await carregarAnimes();
              Alert.alert(t('button.del_success'), t('button.del_success_anime'));
            } catch (error) {
              console.error('Error to delete anime:', error);
              Alert.alert(t('return.error'), t('return.error_delete_anime'));
            }
          }
        }
      ]
    );
  }, []); // Adicionado useCallback para estabilizar a função

  const editarAnime = useCallback((anime: Anime) => {
    router.push({
      pathname: '/input',
      params: {
        id: anime.id,
        nome: anime.nome,
        status: anime.status,
        release_day: anime.release_day,
        observacao: anime.observacao,
        link: anime.link,
        seasons: anime.seasons,
      }
    });
  }, [router]); // Adicionado useCallback para estabilizar a função

  const abrirLink = useCallback((url: string | null) => {
    if (!url) {
      Alert.alert(t('return.warning'), t('return.no_link'));
      return;
    }

    // 1. Remove espaços em branco no início e no fim da string
    const cleanInput = url.trim();

    if (!cleanInput) {
      Alert.alert(t('return.warning'), t('return.no_link'));
      return;
    }

    // 2. Garante que a URL tenha o protocolo http ou https
    let formattedUrl = cleanInput;
    if (!/^https?:\/\//i.test(cleanInput)) {
      formattedUrl = `https://${cleanInput}`;
    }

    // 3. Converte espaços e caracteres especiais em formato aceito por URLs (%20)
    const finalUrl = encodeURI(formattedUrl);

    // 4. Tenta abrir a URL formatada
    Linking.openURL(finalUrl).catch((err) =>
      Alert.alert(t('return.error'), `${t('return.error_open_link')}: ${err.message}`)
    );
  }, [t]);
  const animesFiltrados = React.useMemo(() => {
    let lista = [...animes];

    // 1. Se estiver buscando, ignora os filtros de botões e pesquisa em tudo
    if (busca) {
      const termo = busca.toLowerCase();
      return lista.filter(a => a.nome.toLowerCase().includes(termo)).sort((a, b) => a.id - b.id);
    }

    // 2. Se o botão "ALL" estiver ativo: Mostra TUDO (Watching + Plan + Completed)
    if (selectedDayFilter === 'all') {
      return lista.sort((a, b) => b.id - a.id);
    }

    // 3. Se o botão "Plan to Watch" estiver ativo: Mostra APENAS a fila
    if (selectedDayFilter === 'plan_to_watch') {
      return lista
        .filter(a => a.status === 'plan_to_watch')
        .sort((a, b) => b.id - a.id);
    }

    // 4. Se um DIA DA SEMANA estiver ativo: Mostra Watching que lançam naquele dia
    if (selectedDayFilter && selectedDayFilter !== 'all') {
      return lista
        .filter(a => a.status === 'watching' && a.release_day === selectedDayFilter)
        .sort((a, b) => b.id - a.id);
    }

    // 5. PADRÃO (Nenhum botão): Mostra apenas o que você está assistindo agora (Watching)
    // Ordenado por dia da semana (segunda, terça...)
    return lista.filter(a => a.status === 'watching').sort((a, b) => {
      if (!a.release_day) return 1;
      if (!b.release_day) return -1;
      return dayOrder[a.release_day] - dayOrder[b.release_day] || b.id - a.id;
    });
  }, [animes, busca, selectedDayFilter]);


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.buscaContainer, { borderColor: colors.tabIconDefault, backgroundColor: colors.inputBackground }]}>
        <TextInput
          style={[
            styles.buscaInput,
            {
              color: colors.text,
              backgroundColor: colors.background,
              borderColor: colors.borderColor
            }
          ]}
          placeholder={t('placeholder.search_animes')}
          placeholderTextColor={"gray"}
          value={busca}
          onChangeText={(text) => {
            setBusca(text);
            if (text) setSelectedDayFilter(null);
          }}
        />
      </View>

      {!busca && (
        <View style={[styles.dayFilterContainer, { backgroundColor: colors.background }]}>
          <FlatList // Usando FlatList para os botões de filtro de dia horizontalmente
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayFilterScrollViewContent}
            data={daysOfWeek}
            keyExtractor={(item) => item.value}
            renderItem={({ item: day }) => (
              <TouchableOpacity
                key={day.value}
                style={[
                  styles.dayFilterButton,
                  {
                    backgroundColor: selectedDayFilter === day.value ? colors.tint : colors.inputBackground,
                    borderColor: selectedDayFilter === day.value ? colors.tint : colors.borderColor,
                  },
                ]}
                onPress={() => setSelectedDayFilter(day.value === selectedDayFilter ? null : day.value)}
              >
                <Text style={[
                  styles.dayFilterButtonText,
                  { color: selectedDayFilter === day.value ? colors.background : colors.text },
                ]}>
                  {day.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <FlatList // <--- SUBSTITUINDO SCROLLVIEW POR FLATLIST AQUI ---
        style={styles.flatList} // Use um estilo adequado para a FlatList
        contentContainerStyle={styles.flatListContentContainer} // Para padding e margin do conteúdo
        data={animesFiltrados}
        keyExtractor={(item) => String(item.id)} // Garante uma chave única e estável para a virtualização
        renderItem={({ item }) => (
          <AnimeItem
            anime={item}
            colors={colors}
            abrirLink={abrirLink}
            editarAnime={editarAnime}
            confirmarExclusao={confirmarExclusao}
          />
        )}
        ListEmptyComponent={() => ( // Componente exibido quando a lista está vazia
          <Text style={[styles.noAnimesText, { color: colors.text }]}>{t('return.no_anime_found')}</Text>
        )}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      // Opcional: Adicionar props de performance se necessário (descomente para testar)
      // initialNumToRender={10}
      // maxToRenderPerBatch={5}
      // windowSize={21}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  buscaContainer: {
    marginTop: 10,
    borderRadius: 12,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    padding: 10,
    margin: 10,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buscaInput: {
    height: 50,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  dayFilterContainer: {
    marginHorizontal: 0,
    marginTop: 10,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayFilterScrollViewContent: { // Renomeado para flatListContentContainerDayFilter para ser mais específico
    paddingHorizontal: 5,
  },
  dayFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 4,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayFilterButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  flatList: { // Estilo para a FlatList principal
    flex: 1,
  },
  flatListContentContainer: { // Estilo para o conteúdo dentro da FlatList
    padding: 20,
    paddingTop: 15,
  },
  animeContainer: {
    borderRadius: 12,
    marginBottom: 25,
    overflow: 'hidden',
  },
  animeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  animeInfoPrincipal: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  animeNome: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
    flexShrink: 1,
  },
  animeStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  animeDetalhes: {
    padding: 15,
    borderTopWidth: 1,
  },
  detalheItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detalheLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  detalheValor: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  linkButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    flexShrink: 1,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  animeAcoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
    borderTopWidth: 1,
  },
  spacer: {
    width: 10,
  },
  noAnimesText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
});