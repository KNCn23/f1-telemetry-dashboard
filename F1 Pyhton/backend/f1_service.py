import fastf1
import os
import pandas as pd
import json

# Önbellek dizini oluştur ve etkinleştir
CACHE_DIR = os.path.join(os.path.dirname(__file__), 'cache')
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

fastf1.Cache.enable_cache(CACHE_DIR)

def get_available_years():
    """Desteklenen yılları döndürür (FastF1 telemetri verisi 2018'den itibaren güvenilirdir)"""
    return list(range(2024, 2017, -1)) # 2024'den 2018'e

def get_schedule(year: int):
    """Bir yıla ait tüm F1 yarışlarının takvimini getirir."""
    schedule = fastf1.get_event_schedule(year)
    # Sadece puan verilen yarışları veya genel yarış haftalarını filtrele (Testleri yoksayabiliriz)
    # RoundNumber'ı olan etkinlikler genelde resmi yarış haftalarıdır.
    schedule = schedule.dropna(subset=['RoundNumber'])
    
    # JSON serileştirme hatalarını önlemek için veri tiplerini düzelt
    events = []
    for _, row in schedule.iterrows():
        events.append({
            'round': int(row['RoundNumber']),
            'country': row['Country'],
            'location': row['Location'],
            'event_name': row['EventName'],
            'official_event_name': row['OfficialEventName'],
            'date': str(row['EventDate'])
        })
    return events

def get_sessions(year: int, round_number: int):
    """Bir etkinlik içindeki tüm seansları (FP1, Quali, Race vs.) isimleriyle getirir."""
    event = fastf1.get_event(year, round_number)
    sessions = []
    
    # FastF1 Event objesinde Session1, Session2, ..., Session5 olarak tutulur
    for i in range(1, 6):
        session_name = event.get(f'Session{i}')
        session_date = event.get(f'Session{i}Date')
        if pd.notna(session_name):
            sessions.append({
                'identifier': i,
                'name': session_name,
                'date': str(session_date)
            })
    return {
        'event_name': event['EventName'],
        'sessions': sessions
    }

def get_drivers(year: int, round_number: int, session_id: int):
    """Belirli bir seansta yer alan sürücüleri ve renklerini getirir."""
    event = fastf1.get_event(year, round_number)
    session_name = event.get(f'Session{session_id}')
    
    session = fastf1.get_session(year, round_number, session_name)
    session.load(laps=True, telemetry=False, weather=False, messages=False)

    drivers_info = []
    
    # FastF1'de session.results DataFrame'dir (Sıralama ve yarış sonuçları)
    if hasattr(session, 'results') and not session.results.empty:
        results_df = session.results
        for _, row in results_df.iterrows():
            driver_number = row['DriverNumber']
            
            time_val = row.get('Time', '')
            time_gap = ""
            if pd.notna(time_val):
                time_str = str(time_val)
                if len(time_str) >= 19:
                    time_gap = time_str[10:19]
                else:
                    time_gap = time_str
                    
            status = str(row.get('Status', ''))
            pos = int(row.get('Position', 0)) if pd.notna(row.get('Position')) else 0
            
            drivers_info.append({
                'number': str(driver_number),
                'abbr': str(row.get('Abbreviation', driver_number)),
                'name': str(row.get('BroadcastName', '')),
                'team': str(row.get('TeamName', '')),
                'color': f"#{row.get('TeamColor', 'FFFFFF')}",
                'position': pos,
                'time': time_gap,
                'status': status,
                'points': float(row.get('Points', 0)) if pd.notna(row.get('Points')) else 0
            })
    else:
        for driver_number in session.drivers:
            driver = session.get_driver(driver_number)
            drivers_info.append({
                'number': str(driver_number),
                'abbr': str(driver.get('Abbreviation', driver_number)),
                'name': str(driver.get('BroadcastName', '')),
                'team': str(driver.get('TeamName', '')),
                'color': f"#{driver.get('TeamColor', 'FFFFFF')}",
                'position': 0, 'time': '', 'status': '', 'points': 0
            })
            
    # Position'a göre sırala (Eğer 0 ise en sona at)
    drivers_info.sort(key=lambda x: x['position'] if x['position'] > 0 else 999)
    
    return drivers_info

def get_telemetry(year: int, round_number: int, session_id: int, driver1: str, driver2: str = None):
    """Bir seansta bir (veya iki) sürücünün en hızlı turunun telemetri verisini getirir."""
    event = fastf1.get_event(year, round_number)
    session_name = event.get(f'Session{session_id}')
    
    session = fastf1.get_session(year, round_number, session_name)
    session.load(laps=True, telemetry=True, weather=True, messages=False)

    def extract_driver_data(drv):
        if not drv: return None
        d_laps = session.laps.pick_driver(drv)
        if d_laps.empty:
            return None
            
        fastest_lap = d_laps.pick_fastest()
        if pd.isna(fastest_lap['LapTime']):
            return None
            
        lap_time_str = str(fastest_lap['LapTime'])[10:19] # timedelta'dan string'e çevir
        
        # Ekstra Detaylar (Hava, Lastik, Sektörler)
        try:
            weather = fastest_lap.get_weather_data()
            weather_dict = {
                'AirTemp': float(weather['AirTemp']) if pd.notna(weather['AirTemp']) else None,
                'TrackTemp': float(weather['TrackTemp']) if pd.notna(weather['TrackTemp']) else None,
                'Humidity': float(weather['Humidity']) if pd.notna(weather['Humidity']) else None,
                'WindSpeed': float(weather['WindSpeed']) if pd.notna(weather['WindSpeed']) else None
            }
        except:
            weather_dict = {}

        lap_details = {
            'Compound': str(fastest_lap.get('Compound', '-')),
            'TyreLife': float(fastest_lap['TyreLife']) if pd.notna(fastest_lap.get('TyreLife')) else 0,
            'Sector1': str(fastest_lap['Sector1Time'])[10:19] if pd.notna(fastest_lap.get('Sector1Time')) else "-",
            'Sector2': str(fastest_lap['Sector2Time'])[10:19] if pd.notna(fastest_lap.get('Sector2Time')) else "-",
            'Sector3': str(fastest_lap['Sector3Time'])[10:19] if pd.notna(fastest_lap.get('Sector3Time')) else "-"
        }
        
        # Telemetriyi al
        tel = fastest_lap.get_telemetry()
        
        # Ön yüze çok veri basıp tarayıcıyı dondurmamak için her 3. veya 2. kaydı alıyoruz
        # Şimdilik 1/3 oranında örnekleme alalım (iloc[::3])
        req_cols = ['Distance', 'Speed', 'Throttle', 'Brake', 'nGear', 'X', 'Y', 'RPM', 'DRS']
        available_cols = [c for c in req_cols if c in tel.columns]
        tel = tel[available_cols].iloc[::3].copy()
        
        # Null değerleri doldur
        tel.fillna(0, inplace=True)
        
        return {
            'driver': drv,
            'lap_time': lap_time_str,
            'lap_details': lap_details,
            'weather': weather_dict,
            'telemetry': tel.to_dict('records')
        }

    results = []
    res1 = extract_driver_data(driver1)
    if res1: results.append(res1)
        
    res2 = extract_driver_data(driver2)
    if res2: results.append(res2)

    return results
