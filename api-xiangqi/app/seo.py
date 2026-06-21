# SEO Meta Tags Generation — Phase 1
# Provides dynamic meta tags for social sharing (OG, Twitter, Schema.org)

from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from PIL import Image, ImageDraw, ImageFont
import io
import base64
import time
from . import db

# Meta tag response model
class MetaTagsResponse(BaseModel):
    title: str
    description: str
    image: str  # URL or data:image/png;base64,...
    image_type: str = "image/png"
    canonical_url: str
    locale: str = "en_US"
    type: str = "website"
    article_published_time: Optional[str] = None
    article_modified_time: Optional[str] = None
    keywords: Optional[str] = None
    schema: Optional[dict] = None


def generate_player_card_image(player_id: str, username: str, elo: int, wins: int, losses: int, draws: int) -> str:
    """
    Generate a player profile card as PNG image (OG image for social sharing).
    Returns base64-encoded PNG data URL.
    """
    # Create image (1200x630 for OG)
    width, height = 1200, 630
    img = Image.new('RGB', (width, height), color='#0a0e1a')
    draw = ImageDraw.Draw(img)

    # Draw background gradient effect (simple solid for now)
    draw.rectangle([(0, 0), (width, height)], fill='#0a0e1a')
    draw.rectangle([(20, 20), (width - 20, height - 20)], outline='#06d6a0', width=3)

    # Try to use a better font, fallback to default
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
        text_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
    except:
        title_font = ImageFont.load_default()
        text_font = ImageFont.load_default()

    # Draw title
    draw.text((60, 80), f"{username}", fill='#06d6a0', font=title_font)

    # Draw ELO
    draw.text((60, 180), f"ELO: {elo}", fill='#ffffff', font=text_font)

    # Draw record
    record_text = f"Record: {wins}W {losses}L {draws}D"
    draw.text((60, 280), record_text, fill='#aaaaaa', font=text_font)

    # Draw rank percentile (simplified)
    draw.text((60, 380), "Top Player", fill='#ffeb3b', font=text_font)

    # Draw branding
    draw.text((60, 520), "Cờ Tướng Vương", fill='#06d6a0', font=text_font)

    # Convert to base64
    with io.BytesIO() as output:
        img.save(output, format='PNG')
        img_data = base64.b64encode(output.getvalue()).decode()

    return f"data:image/png;base64,{img_data}"


def generate_game_board_image(game_id: str, position: str, white_player: str, black_player: str) -> str:
    """
    Generate a game board state as PNG image (OG image for social sharing).
    Returns base64-encoded PNG data URL.
    """
    # Create image (1200x1200 for square board)
    width, height = 1200, 1200
    img = Image.new('RGB', (width, height), color='#dcc899')
    draw = ImageDraw.Draw(img)

    # Draw board grid (10x9)
    square_width = (width - 100) / 9
    square_height = (height - 100) / 10

    # Draw board
    for x in range(10):
        for y in range(11):
            left = 50 + x * square_width
            top = 50 + y * square_height
            draw.rectangle([(left, top), (left + square_width, top + square_height)], outline='#000000')

    # Try to use a better font
    try:
        text_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
    except:
        text_font = ImageFont.load_default()

    # Draw player names
    draw.text((50, 1100), f"{white_player} (Red)", fill='#000000', font=text_font)
    draw.text((50, 30), f"{black_player} (Black)", fill='#000000', font=text_font)

    # Convert to base64
    with io.BytesIO() as output:
        img.save(output, format='PNG')
        img_data = base64.b64encode(output.getvalue()).decode()

    return f"data:image/png;base64,{img_data}"


def build_player_schema(player_id: str, username: str, elo: int) -> dict:
    """Build Schema.org Person schema for player profile."""
    return {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": username,
        "url": f"https://xiangqi.games-core.com/#/player/{player_id}",
        "description": f"Xiangqi player with ELO rating {elo}",
        "image": f"https://xiangqi.games-core.com/api/seo/player/{player_id}/card.png",
        "interactionStatistic": {
            "@type": "InteractionCounter",
            "interactionType": "https://schema.org/PlayAction",
            "userInteractionCount": elo,
        },
    }


def build_game_schema(game_id: str, white_player: str, black_player: str) -> dict:
    """Build Schema.org Game schema for game record."""
    return {
        "@context": "https://schema.org",
        "@type": "GamePlaySession",
        "identifier": game_id,
        "url": f"https://xiangqi.games-core.com/#/game/{game_id}",
        "gameName": "Xiangqi",
        "participant": [
            {"@type": "Person", "name": white_player, "playerRole": "white"},
            {"@type": "Person", "name": black_player, "playerRole": "black"},
        ],
    }


async def get_player_meta(player_id: str, db_override=None) -> Optional[MetaTagsResponse]:
    """
    Get SEO meta tags for a player profile.
    Queries users and elo_profiles tables for player info.
    """
    try:
        player_id_int = int(player_id)
    except ValueError:
        return None

    try:
        user_row = db.fetch_one("SELECT id, display_name, avatar_url FROM users WHERE id = ?", (player_id_int,))
        if not user_row:
            return None

        elo_row = db.fetch_one(
            "SELECT elo, wins, losses, draws FROM elo_profiles WHERE user_id = ? AND variant = 'standard' LIMIT 1",
            (player_id_int,)
        )

        username = user_row['display_name']
        elo = elo_row['elo'] if elo_row else 1200
        wins = elo_row['wins'] if elo_row else 0
        losses = elo_row['losses'] if elo_row else 0
        draws = elo_row['draws'] if elo_row else 0

        card_image = generate_player_card_image(player_id, username, elo, wins, losses, draws)

        return MetaTagsResponse(
            title=f"{username} - Xiangqi Player | Cờ Tướng Vương",
            description=f"ELO {elo} • {wins}W {losses}L {draws}D • Play Xiangqi with {username}",
            image=card_image,
            canonical_url=f"https://xiangqi.games-core.com/#/player/{player_id}",
            keywords=f"xiangqi, chinese chess, {username}, elo {elo}",
            type="profile",
            schema=build_player_schema(player_id, username, elo),
        )
    except Exception as e:
        print(f"[seo] Error fetching player meta for {player_id}: {e}")
        return None


async def get_game_meta(game_id: str, db_override=None) -> Optional[MetaTagsResponse]:
    """
    Get SEO meta tags for a game record.
    Queries games table and looks up player names from users table.
    """
    try:
        game_row = db.fetch_one(
            "SELECT red_user_id, black_user_id, variant, result, played_at FROM games WHERE id = ?",
            (game_id,)
        )
        if not game_row:
            return None

        red_user_id = game_row['red_user_id']
        black_user_id = game_row['black_user_id']
        variant = game_row['variant']
        result = game_row['result']

        red_name = "Red"
        black_name = "Black"

        if red_user_id:
            red_user = db.fetch_one("SELECT display_name FROM users WHERE id = ?", (red_user_id,))
            if red_user:
                red_name = red_user['display_name']

        if black_user_id:
            black_user = db.fetch_one("SELECT display_name FROM users WHERE id = ?", (black_user_id,))
            if black_user:
                black_name = black_user['display_name']

        result_str = result if result else "In Progress"

        card_image = generate_game_board_image(game_id, "", red_name, black_name)

        return MetaTagsResponse(
            title=f"{red_name} vs {black_name} - {variant.title()} Game",
            description=f"{red_name} (Red) vs {black_name} (Black) • Result: {result_str}",
            image=card_image,
            canonical_url=f"https://xiangqi.games-core.com/#/game/{game_id}",
            keywords=f"xiangqi, game, {red_name}, {black_name}",
            type="game",
            schema=build_game_schema(game_id, red_name, black_name),
        )
    except Exception as e:
        print(f"[seo] Error fetching game meta for {game_id}: {e}")
        return None


async def get_replay_meta(replay_id: str, db_override=None) -> Optional[MetaTagsResponse]:
    """Get SEO meta tags for a game replay (same as game meta)."""
    return await get_game_meta(replay_id, db_override)


# Schema.org Breadcrumb List helper
def build_breadcrumb_schema(path: list[str]) -> dict:
    """
    Build Schema.org BreadcrumbList.
    path: [("Home", "/"), ("Player", "#/player"), ("John", "#/player/123")]
    """
    items = []
    base_url = "https://xiangqi.games-core.com"

    for idx, (label, url) in enumerate(path, 1):
        items.append({
            "@type": "ListItem",
            "position": idx,
            "name": label,
            "item": f"{base_url}{url}",
        })

    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items,
    }
