# SmartLaundry - material do opisu pracy inżynierskiej

## Prompt dla Prism

Napisz po polsku opis pracy inżynierskiej w stylu akademickim na podstawie poniższych informacji. Traktuj projekt jako ukończony i działający. Zachowaj strukturę podobną do pracy dyplomowej: strona tytułowa, spis treści, wprowadzenie, rozdziały, opis celu, porównanie istniejących rozwiązań, opis projektu, implementacja, funkcje, architektura, model danych, interfejs użytkownika, wykorzystane technologie, wdrożenie, testowanie, podsumowanie, linkografia i załączniki. Używaj języka formalnego, ale zrozumiałego. Nie opisuj projektu jako niedokończonego. Nazwa projektu: SmartLaundry.

---

# Strona tytułowa - dane do uzupełnienia

Uniwersytet: [nazwa uczelni]  
Wydział / Instytut: [nazwa jednostki]  

Autor: [imię i nazwisko]  
Tytuł pracy: **SmartLaundry - internetowy system zarządzania pralnią i rezerwacją pralek w budynkach współdzielonych**  
Rodzaj pracy: Praca inżynierska  
Numer albumu: [numer albumu]  
Kierunek: Informatyka  
Specjalność: Programowanie  
Profil studiów: Praktyczny  
Promotor: [imię i nazwisko promotora]  
Data zakończenia pracy: [data]  

---

# Spis treści

1. Wprowadzenie  
2. Rozdział I - Cel i główne założenia  
3. Przegląd i porównanie istniejących rozwiązań  
4. Rozdział II - Opis projektu  
5. Rozdział III - Implementacja  
6. Funkcje systemu  
7. Architektura aplikacji  
8. Model danych  
9. Interfejs użytkownika  
10. Wykorzystane technologie  
11. Wdrożenie  
12. Rozdział IV - Testowanie i wyniki  
13. Rozdział V - Podsumowanie i wnioski  
14. Linkografia  
15. Załączniki  

---

# Wprowadzenie

Współczesne akademiki, domy studenckie, hotele pracownicze oraz inne budynki współdzielone bardzo często korzystają ze wspólnych pralni. Tego typu przestrzenie są wygodne, ponieważ pozwalają wielu osobom używać tych samych urządzeń bez konieczności posiadania własnej pralki. Jednocześnie wspólne użytkowanie pralni powoduje wiele praktycznych problemów organizacyjnych. Użytkownicy nie zawsze wiedzą, czy dana pralka jest wolna, kiedy zakończy się poprzednie pranie, kto zarezerwował maszynę oraz czy w najbliższym czasie będzie dostępny dogodny termin.

W wielu miejscach proces korzystania z pralni odbywa się w sposób nieformalny. Użytkownicy przychodzą do pomieszczenia i sprawdzają dostępność urządzeń bezpośrednio na miejscu. Czasami stosowane są listy papierowe, wiadomości w komunikatorach lub ustne uzgodnienia między mieszkańcami. Takie rozwiązania są mało przejrzyste, podatne na pomyłki i nie zapewniają równego dostępu do urządzeń. Brak centralnego systemu rezerwacji prowadzi do konfliktów, strat czasu oraz nieefektywnego wykorzystania pralek.

Projekt SmartLaundry powstał jako odpowiedź na te problemy. Aplikacja internetowa umożliwia użytkownikom sprawdzenie dostępności pralek, wybór najbliższego terminu, dokonanie rezerwacji, otrzymywanie powiadomień oraz zarządzanie własnymi rezerwacjami. System został zaprojektowany z myślą o budynkach, w których jedna lub kilka pralni jest udostępniana większej liczbie osób. Ważnym założeniem projektu było stworzenie rozwiązania prostego w obsłudze dla zwykłego użytkownika oraz elastycznego dla administratora zarządzającego terytoriami, strefami i urządzeniami.

SmartLaundry nie ogranicza się wyłącznie do statycznej listy pralek. System analizuje dostępne programy prania, wyznacza długość slotów rezerwacyjnych, uwzględnia aktywne rezerwacje, pozwala ograniczyć liczbę rezerwacji użytkownika oraz informuje o ważnych zdarzeniach poprzez powiadomienia. Dzięki temu aplikacja pełni funkcję praktycznego narzędzia organizacyjnego, które poprawia komfort korzystania ze wspólnej pralni.

---

# Rozdział I

## Cel i główne założenia

Celem projektu SmartLaundry było stworzenie internetowego systemu służącego do zarządzania pralnią oraz procesem rezerwowania pralek w budynkach współdzielonych. Głównym założeniem aplikacji było ułatwienie użytkownikom dostępu do pralek, ograniczenie konfliktów związanych z kolejnością korzystania z urządzeń oraz automatyzacja procesu planowania rezerwacji.

System został zaprojektowany tak, aby spełniał następujące wymagania:

- umożliwiał użytkownikowi dołączenie do odpowiedniego terytorium za pomocą kodu dostępu;
- prezentował dostępne strefy pralni oraz znajdujące się w nich pralki;
- pokazywał status urządzeń, na przykład dostępna, zajęta lub niedostępna;
- pozwalał zarezerwować pralkę w jednym z dostępnych slotów czasowych;
- wyliczał długość slotu na podstawie najdłuższego programu prania albo ustawienia administratora;
- ograniczał liczbę aktywnych rezerwacji użytkownika w trzydniowym oknie;
- wysyłał powiadomienia związane z rezerwacjami;
- umożliwiał użytkownikowi przeglądanie aktywnych i historycznych rezerwacji;
- pozwalał anulować aktywną rezerwację;
- zapewniał administratorowi możliwość tworzenia i konfiguracji terytoriów, stref, pralek oraz programów prania.

Projekt zakładał również opracowanie przejrzystego interfejsu użytkownika. Aplikacja miała działać zarówno na komputerach, jak i na urządzeniach mobilnych. Istotne było także przygotowanie trybu jasnego i ciemnego, ponieważ użytkownicy mogą korzystać z systemu w różnych warunkach oświetleniowych.

## Przegląd i porównanie istniejących rozwiązań

Na rynku istnieją różne sposoby organizowania korzystania ze wspólnych pralni. Najprostszym rozwiązaniem jest brak systemu rezerwacji. Użytkownik przychodzi do pralni i sprawdza, czy pralka jest wolna. Takie podejście nie wymaga żadnej infrastruktury technicznej, ale jest niewygodne i nieefektywne. Użytkownik może wielokrotnie przychodzić do pralni bez skutku, a brak informacji o kolejności korzystania z urządzeń prowadzi do nieporozumień.

Drugim często spotykanym rozwiązaniem jest lista papierowa. Mieszkańcy wpisują swoje nazwiska oraz godziny korzystania z pralek. System ten jest prosty, ale ma wiele ograniczeń. Lista może zostać zgubiona, zniszczona albo nieczytelnie wypełniona. Nie istnieje też automatyczna kontrola limitów rezerwacji, powiadomienia ani szybkie wyszukiwanie najbliższego wolnego slotu.

Kolejną możliwością są komunikatory, takie jak Messenger, WhatsApp lub grupy w mediach społecznościowych. Pozwalają one na wymianę informacji, lecz nie zapewniają uporządkowanego procesu rezerwacji. Wiadomości szybko giną w historii rozmów, a użytkownicy muszą samodzielnie ustalać dostępność urządzeń. Brakuje mechanizmu walidacji, limitów, automatycznego anulowania czy jednoznacznego potwierdzania rezerwacji.

SmartLaundry różni się od tych rozwiązań tym, że łączy prostotę obsługi z formalnym mechanizmem rezerwacji. Użytkownik widzi dostępne pralki, wybiera dzień z trzydniowego okna, przegląda wolne sloty, potwierdza rezerwację i otrzymuje powiadomienia. Administrator może natomiast zarządzać strukturą pralni i kontrolować czas trwania slotów. Takie podejście tworzy bardziej przejrzysty, sprawiedliwy i skalowalny system.

---

# Rozdział II

## Opis projektu

SmartLaundry jest aplikacją internetową przeznaczoną do obsługi wspólnych pralni. System składa się z części użytkownika oraz części administracyjnej. Użytkownik po zalogowaniu może dodać terytorium za pomocą kodu, przeglądać dostępne strefy, sprawdzać statusy pralek, wyszukiwać najbliższy wolny slot oraz dokonywać rezerwacji. Administrator może tworzyć terytoria, definiować strefy, dodawać urządzenia, ustawiać modele pralek oraz określać sposób wyznaczania długości slotów rezerwacyjnych.

Pojęcie terytorium oznacza logiczną przestrzeń przypisaną do określonego budynku, akademika lub grupy użytkowników. Każde terytorium może zawierać wiele stref. Strefa odpowiada konkretnemu miejscu, na przykład pomieszczeniu pralni, piętru lub części budynku. W każdej strefie znajdują się pralki, które mogą być rezerwowane przez użytkowników posiadających dostęp do danego terytorium.

Jednym z ważnych elementów projektu jest mechanizm wyznaczania slotów czasowych. System może działać w dwóch trybach. W pierwszym trybie długość slotu jest obliczana automatycznie na podstawie najdłuższego programu prania odczytanego z instrukcji lub danych urządzenia. Jeżeli najdłuższy program trwa na przykład 3 godziny i 15 minut, system zaokrągla ten czas w górę do najbliższej pełnej lub półpełnej godziny, czyli do 3 godzin i 30 minut. Następnie doba jest dzielona na sloty: 00:00-03:30, 03:30-07:00 i tak dalej. W drugim trybie administrator może ustawić stały średni czas rezerwacji, na przykład 2 godziny. Wtedy sloty mają postać 00:00-02:00, 02:00-04:00 itd.

Aplikacja ogranicza rezerwacje do najbliższych trzech dni: dzisiaj, jutro oraz pojutrze. Użytkownik nie korzysta z pełnego kalendarza, lecz z prostego przełącznika dni. Dzięki temu interfejs pozostaje przejrzysty, a system ogranicza zbyt odległe blokowanie urządzeń.

---

# Rozdział III

## Implementacja

Projekt został zaimplementowany jako aplikacja webowa z podziałem na frontend i backend. Frontend odpowiada za interfejs użytkownika, obsługę widoków, formularzy, motywów kolorystycznych oraz komunikację z API. Backend odpowiada za logikę biznesową, przechowywanie danych, uwierzytelnianie, walidację rezerwacji, obsługę terytoriów oraz generowanie powiadomień.

Implementacja została wykonana z naciskiem na czytelność, modularność i możliwość dalszego rozwoju. System został przygotowany tak, aby w przyszłości można było rozszerzyć go o dodatkowe funkcje, na przykład rzeczywisty check-in przy pralce, integrację z kodami QR, panel serwisowy, statystyki użycia urządzeń lub płatności.

## Funkcje systemu

Najważniejsze funkcje systemu SmartLaundry obejmują:

1. Rejestrację i logowanie użytkowników.
2. Obsługę ról użytkownika i administratora.
3. Dodawanie terytorium za pomocą kodu dostępu.
4. Tworzenie terytoriów przez administratora.
5. Definiowanie stref i pralek.
6. Importowanie lub definiowanie programów prania.
7. Automatyczne obliczanie długości slotów rezerwacyjnych.
8. Możliwość ustawienia stałego dwugodzinnego slotu przez administratora.
9. Widok dashboardu dla zalogowanego użytkownika.
10. Przełącznik rezerwacji na trzy najbliższe dni.
11. Wyszukiwanie najbliższego wolnego slotu.
12. Podświetlenie pralki z najbliższym wolnym terminem.
13. Ekran szczegółów rezerwacji wybranej pralki.
14. Modal potwierdzenia rezerwacji.
15. Limit maksymalnie trzech aktywnych rezerwacji w trzydniowym oknie.
16. Widok „My bookings” z aktywnymi i historycznymi rezerwacjami.
17. Możliwość anulowania aktywnej rezerwacji.
18. System powiadomień.
19. Tryb jasny i ciemny.
20. Responsywny interfejs dla komputerów i urządzeń mobilnych.

## Architektura aplikacji

Aplikacja została zaprojektowana w architekturze klient-serwer. Warstwa kliencka komunikuje się z backendem za pomocą API. Backend udostępnia endpointy odpowiedzialne za autoryzację, listę terytoriów, strukturę pralni, rezerwacje oraz powiadomienia.

Warstwa frontendowa została podzielona na obszary funkcjonalne:

- powłoka aplikacji, czyli górne menu, boczna nawigacja i przełącznik motywu;
- widok dashboardu z listą pralek i mechanizmem rezerwacji;
- widok szczegółów wybranej pralki;
- widok powiadomień;
- widok moich rezerwacji;
- komponenty konta użytkownika i panelu administratora.

Backend realizuje główne reguły biznesowe. Dzięki temu użytkownik nie może obejść limitów rezerwacji poprzez zmianę danych po stronie przeglądarki. Serwer sprawdza poprawność czasu rezerwacji, długość slotu, kolizje z innymi rezerwacjami oraz limit aktywnych rezerwacji.

## Model danych

Model danych systemu obejmuje następujące główne encje:

- **User** - użytkownik systemu, posiadający konto i rolę;
- **Territory** - terytorium, na przykład akademik lub budynek;
- **TerritoryAccess** - relacja określająca, który użytkownik ma dostęp do danego terytorium;
- **Zone** - strefa w obrębie terytorium, na przykład konkretna pralnia lub piętro;
- **Machine** - pralka przypisana do strefy;
- **WashProgram** - program prania z czasem trwania;
- **Booking** - rezerwacja urządzenia w określonym czasie;
- **UserNotification** - powiadomienie użytkownika związane z rezerwacją lub stanem prania;
- **InstructionTemplate** - szablon instrukcji urządzenia z odczytanymi programami.

Relacje między encjami pozwalają odwzorować strukturę rzeczywistej pralni. Terytorium zawiera strefy, strefy zawierają pralki, pralki posiadają programy prania i rezerwacje. Użytkownik może mieć dostęp do wielu terytoriów, a każda rezerwacja jest powiązana z konkretnym użytkownikiem oraz konkretną pralką.

## Interfejs użytkownika

Interfejs użytkownika został zaprojektowany tak, aby najważniejsza ścieżka działania była możliwie krótka: znaleźć dostępną pralkę, wybrać dzień, wybrać slot i potwierdzić rezerwację. Główny dashboard pokazuje nazwę terytorium, przełącznik trzech dni, blok wyszukiwania najbliższego wolnego slotu, limit aktywnych rezerwacji oraz listę stref z pralkami.

Każda pralka jest prezentowana jako karta z ikoną urządzenia, numerem, modelem, statusem i informacją o najbliższym wolnym czasie. Kolor bębna pralki odpowiada statusowi urządzenia. Zielony oznacza dostępność, pomarańczowy zajętość, a czerwony lub szary problem techniczny lub niedostępność.

Po wybraniu pralki użytkownik przechodzi do ekranu rezerwacji. Widzi tam szczegóły urządzenia, aktualną datę, aktualny czas, dostępne sloty oraz zasady korzystania. Przed ostatecznym utworzeniem rezerwacji system pokazuje modal potwierdzenia. Użytkownik może sprawdzić numer pralki, lokalizację, datę, godzinę oraz informację o konieczności potwierdzenia rezerwacji w ciągu pierwszych 15 minut od jej rozpoczęcia.

W bocznym menu użytkownik ma dostęp do dashboardu, własnych rezerwacji, powiadomień, pomocy oraz instrukcji działania systemu. Menu może zostać zwinięte do samych ikon, co zwiększa przestrzeń roboczą na mniejszych ekranach.

## Wykorzystane technologie

Do realizacji projektu wykorzystano następujące technologie:

- **React** - budowa interfejsu użytkownika;
- **TypeScript** - typowanie kodu frontendowego;
- **Tailwind CSS** - stylowanie komponentów;
- **Vite** - środowisko budowania aplikacji frontendowej;
- **Django** - backend aplikacji;
- **Django REST Framework** - tworzenie API;
- **SQLite / relacyjna baza danych** - przechowywanie danych w środowisku lokalnym;
- **JWT / tokeny autoryzacyjne** - obsługa logowania i zabezpieczenia API;
- **Lucide Icons** - ikony interfejsu;
- **Parser instrukcji** - odczytywanie programów prania i czasu trwania z danych urządzeń.

## Wdrożenie

Aplikacja została przygotowana do uruchomienia w środowisku lokalnym oraz do dalszego wdrożenia na serwerze. Frontend uruchamiany jest jako aplikacja Vite, natomiast backend jako aplikacja Django. Komunikacja między warstwami odbywa się przez API. System może zostać wdrożony na jednym serwerze lub w architekturze rozdzielonej, gdzie frontend i backend są hostowane osobno.

W celu wdrożenia produkcyjnego należy skonfigurować bazę danych, zmienne środowiskowe, domenę, ustawienia bezpieczeństwa Django, obsługę plików statycznych oraz mechanizm regularnego uruchamiania zadań związanych z powiadomieniami.

---

# Rozdział IV

## Testowanie i wyniki

Testowanie systemu obejmowało zarówno warstwę backendową, jak i frontendową. Po stronie backendu sprawdzono poprawność parsera instrukcji, tworzenie programów prania, działanie walidacji rezerwacji, limity aktywnych rezerwacji oraz poprawność endpointów API. Po stronie frontendowej sprawdzono budowanie aplikacji, przechodzenie między widokami, zmianę motywu, działanie menu, otwieranie modali oraz podstawowy przepływ rezerwacji.

Najważniejsze scenariusze testowe:

1. Użytkownik loguje się do systemu.
2. Użytkownik dodaje terytorium za pomocą kodu.
3. Dashboard wyświetla strefy i pralki.
4. Użytkownik wybiera dzień z trzydniowego zakresu.
5. System pokazuje dostępne sloty.
6. Użytkownik wybiera pralkę i slot.
7. System pokazuje modal potwierdzenia.
8. Po potwierdzeniu tworzona jest rezerwacja.
9. Rezerwacja pojawia się w widoku „My bookings”.
10. Użytkownik może anulować aktywną rezerwację.
11. Anulowana rezerwacja pojawia się w historii.
12. System blokuje utworzenie czwartej aktywnej rezerwacji w trzydniowym oknie.
13. System wysyła powiadomienie o zbliżającym się rozpoczęciu rezerwacji.
14. Po zakończeniu slotu system tworzy powiadomienie o końcu rezerwacji.

Wyniki testów potwierdziły, że aplikacja realizuje założone funkcje i może zostać wykorzystana jako praktyczny system organizacji pralni.

---

# Rozdział V

## Podsumowanie i wnioski

Projekt SmartLaundry stanowi kompletne rozwiązanie problemu organizacji wspólnej pralni. Aplikacja umożliwia użytkownikom szybkie sprawdzenie dostępności pralek, wybór dogodnego terminu oraz zarządzanie rezerwacjami. Administrator otrzymuje narzędzie do konfigurowania terytoriów, stref, urządzeń i zasad rezerwacji.

Najważniejszą zaletą systemu jest połączenie prostego interfejsu z automatyczną logiką rezerwacyjną. Użytkownik nie musi samodzielnie analizować długości programów ani sprawdzać kolizji z innymi osobami. System robi to automatycznie. Mechanizm trzydniowego okna i limitu trzech aktywnych rezerwacji zapobiega nadmiernemu blokowaniu pralek przez jedną osobę.

Projekt pokazał, że nawet pozornie prosty problem, jak korzystanie ze wspólnej pralni, wymaga przemyślanego podejścia do danych, interfejsu i reguł biznesowych. SmartLaundry może być rozwijany w przyszłości o funkcje takie jak kody QR przy pralkach, potwierdzanie obecności przy urządzeniu, integracja z płatnościami, statystyki użycia, panel serwisowy oraz automatyczne wykrywanie awarii.

Ostatecznie aplikacja spełnia swoje główne zadanie: zwiększa przejrzystość korzystania ze wspólnej pralni, ogranicza konflikty między użytkownikami i poprawia organizację pracy urządzeń.

---

# Linkografia

1. Dokumentacja React - https://react.dev/  
2. Dokumentacja TypeScript - https://www.typescriptlang.org/docs/  
3. Dokumentacja Django - https://docs.djangoproject.com/  
4. Dokumentacja Django REST Framework - https://www.django-rest-framework.org/  
5. Dokumentacja Tailwind CSS - https://tailwindcss.com/docs  
6. Dokumentacja Vite - https://vite.dev/  
7. Dokumentacja Lucide Icons - https://lucide.dev/  

---

# Załączniki

## Załącznik A - Przykładowy przepływ użytkownika

1. Użytkownik loguje się do aplikacji.
2. Wybiera terytorium.
3. Przegląda dostępne strefy.
4. Wybiera dzień rezerwacji.
5. Klika „Find nearest free slot” albo wybiera pralkę ręcznie.
6. Wybiera dostępny slot.
7. Potwierdza rezerwację.
8. Otrzymuje powiadomienie o zbliżającym się rozpoczęciu.
9. Potwierdza rezerwację w ciągu 15 minut od rozpoczęcia slotu.
10. Po zakończeniu slotu rezerwacja przechodzi do historii.

## Załącznik B - Przykładowe statusy pralek

- Available - pralka jest dostępna.
- Busy - pralka jest aktualnie zajęta.
- Maintenance - pralka jest niedostępna z powodu awarii lub serwisu.

## Załącznik C - Przykładowe powiadomienia

- Booking starts soon.
- Washing timer started.
- Washing completed.
- Booking ended.
- Machine became unavailable. Please create another booking.

