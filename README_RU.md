# Как запустить Codex на ночь

## Файлы

- `ONE_SHOT_PROMPT.txt` — короткий промпт для запуска.
- `AGENTS.md` — постоянные правила безопасности, автономности и экономии токенов.
- `PROJECT_SPEC.md` — техническая спецификация.
- `WORKPLAN.md` — рабочие пакеты.
- `TEST_MATRIX.md` — обязательные тесты.
- `FINAL_CHECKLIST.md` — критерии готовности.

## Подготовка

1. Скопируй все файлы в корень отдельного Git-репозитория проекта.
2. Зафиксируй их первым коммитом.
3. Не клади туда seed phrase, основной кошелёк, private key или секретный `.env`.
4. Отключи сон ноутбука от сети питания, иначе локальный Codex остановится.
5. Запусти Codex в автономном режиме, разрешающем редактирование файлов и выполнение команд в репозитории.
6. Вставь содержимое `ONE_SHOT_PROMPT.txt`.

Пример первого коммита:

```powershell
git init
git add AGENTS.md PROJECT_SPEC.md WORKPLAN.md TEST_MATRIX.md FINAL_CHECKLIST.md ONE_SHOT_PROMPT.txt
git commit -m "docs: add BuilderLoop autonomous build specification"
```

## Как экономятся токены

Codex создаёт локальную память:

```text
.codex/PROJECT_STATE.md
.codex/DECISIONS.md
.codex/BLOCKERS.md
.codex/RUN_LOG.md
```

После каждого этапа он сжимает текущее состояние в `PROJECT_STATE.md`, вместо повторного чтения длинного ТЗ.

Ему запрещено:
- многократно печатать целые файлы;
- повторять требования;
- без причины переписывать большие файлы;
- одинаково перезапускать упавшую команду;
- добавлять функции вне MVP;
- останавливаться после плана.

## Что может остаться внешним блокером

Codex должен закончить весь локально проверяемый код, но не должен подделывать:
- Devnet deployment без сети;
- транзакции без Devnet SOL;
- реальный временной разрыв;
- независимого sponsor;
- eligibility;
- transaction links.

В таком случае он заканчивает код, тесты, deployment scripts и оставляет точные команды в `FINAL_REPORT.md`.

## Что проверить утром

```text
FINAL_REPORT.md
.codex/BLOCKERS.md
git log --oneline
git status
```

Особенно внимательно проверь вручную:
- PDA seeds;
- signer/owner constraints;
- config hash serialization;
- Ed25519 parsing;
- CPI binding;
- SPL vault authority;
- withdrawal/close destinations.

Не отправляй код в Mainnet только потому, что агент написал `tests passed`.
