#!/bin/bash

# Автоматический коммит и пуш изменений
# Использование: ./auto-commit.sh "описание изменений"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Проверка изменений...${NC}"

# Проверяем, есть ли изменения
if [[ -z $(git status -s) ]]; then
    echo -e "${GREEN}Нет изменений для коммита${NC}"
    exit 0
fi

# Показываем статус
git status -s

# Добавляем все изменения
echo -e "${YELLOW}Добавление изменений...${NC}"
git add -A

# Формируем сообщение коммита
if [ -z "$1" ]; then
    COMMIT_MSG="chore: Автоматическое сохранение изменений $(date +%Y-%m-%d\ %H:%M:%S)"
else
    COMMIT_MSG="$1"
fi

# Добавляем подпись Claude
COMMIT_MSG="${COMMIT_MSG}

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Создаем коммит
echo -e "${YELLOW}Создание коммита...${NC}"
git commit -m "$COMMIT_MSG"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Коммит создан успешно${NC}"
    
    # Пушим на GitHub
    echo -e "${YELLOW}Отправка на GitHub...${NC}"
    git push origin master
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Изменения успешно отправлены на GitHub${NC}"
    else
        echo -e "${RED}✗ Ошибка при отправке на GitHub${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Ошибка при создании коммита${NC}"
    exit 1
fi