
import base64

# Pubkey desde tauri.conf.json
pubkey_b64 = "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDYyQjczQjEyQzM5NjNCMQpSV1N4WXprc3NYTXJCczRxbW0xQ0NDbzZzYXdXOUNJTEViMDNreE1tcC8yZ01MVE85akptV0tLUQo="
# Firma desde latest.json
sig_b64 = "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVTeFl6a3NzWE1yQm9Tb0Q1VUhnNDFMNUs0TXdoNFhka0FPZ3BxNG1TallMZjBMZlR3YWxXSHN4TXBuVjI0YXpnNC9veWlDbForUi9WaVFHaU96S2pVTGNnUkE3UTAxc0FJPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzc4MDI0NTY1CWZpbGU6UE1NIENoYXRfMC4xLjRfeDY0X2VuLVVTLm1zaQp0Y2xHK21kUTU3a2wzSmRITGlSREprRjMxUW1zb1pYSnlIUlVFWEJZSzFQWWp1YW84ZFZCdlNJSHVpZENjSmtIZElHcGhiVjZJd0k0c3FSQzExQkREdz09Cg=="

try:
    decoded_pub = base64.b64decode(pubkey_b64).decode()
    decoded_sig = base64.b64decode(sig_b64).decode()
    
    print("--- PUBKEY ---")
    print(decoded_pub)
    print("--- SIGNATURE ---")
    print(decoded_sig)
    
    # Extraer Key IDs (están en la segunda línea de cada uno, los primeros 8 bytes)
    # Pero minisign lo pone en la primera línea del pubkey como comentario.
except Exception as e:
    print(f"Error: {e}")
