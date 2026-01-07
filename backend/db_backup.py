"""
Certify Database Backup & Restore
Export and import database for sharing or backup

Usage:
    # Export (backup)
    python db_backup.py export
    python db_backup.py export --output my_backup.sql
    python db_backup.py export --data-only  # Export data only
    python db_backup.py export --schema-only  # Export schema only
    
    # Import (restore)
    python db_backup.py import backup.sql
    python db_backup.py import backup.sql --clean  # Drop tables first
    
    # List backups
    python db_backup.py list
"""

import os
import sys
import argparse
import subprocess
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class DatabaseBackup:
    def __init__(self):
        self.db_name = os.getenv("DB_NAME", "certify_db")
        self.db_user = os.getenv("DB_USER", "postgres")
        self.db_password = os.getenv("DB_PASSWORD", "postgres")
        self.db_host = os.getenv("DB_HOST", "localhost")
        self.db_port = os.getenv("DB_PORT", "5432")
        self.backup_dir = "database/backups"
        
        # Create backup directory
        os.makedirs(self.backup_dir, exist_ok=True)
        
        # Set PGPASSWORD environment variable for pg_dump/psql
        os.environ['PGPASSWORD'] = self.db_password
    
    def print_success(self, text):
        print(f"✅ {text}")
    
    def print_error(self, text):
        print(f"❌ {text}")
    
    def print_info(self, text):
        print(f"ℹ️  {text}")
    
    def generate_filename(self, prefix="backup"):
        """Generate timestamped filename"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{prefix}_{timestamp}.sql"
    
    def export_database(self, output_file=None, data_only=False, schema_only=False):
        """Export database to SQL file"""
        print("\n" + "="*60)
        print("  Database Export")
        print("="*60 + "\n")
        
        # Generate filename if not provided
        if not output_file:
            output_file = self.generate_filename()
        
        # Full path
        if not output_file.startswith(self.backup_dir):
            output_file = os.path.join(self.backup_dir, output_file)
        
        # Build pg_dump command
        cmd = [
            "pg_dump",
            "-h", self.db_host,
            "-p", self.db_port,
            "-U", self.db_user,
            "-d", self.db_name,
            "-F", "p",  # Plain text format
            "-f", output_file
        ]
        
        if data_only:
            cmd.append("--data-only")
            self.print_info("Exporting data only (no schema)")
        elif schema_only:
            cmd.append("--schema-only")
            self.print_info("Exporting schema only (no data)")
        else:
            self.print_info("Exporting complete database (schema + data)")
        
        # Add additional options
        cmd.extend([
            "--no-owner",  # Don't output ownership commands
            "--no-privileges",  # Don't output privilege commands
            "-v"  # Verbose
        ])
        
        print(f"Database: {self.db_name}")
        print(f"Output: {output_file}\n")
        
        try:
            # Run pg_dump
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                # Get file size
                size = os.path.getsize(output_file)
                size_mb = size / (1024 * 1024)
                
                self.print_success(f"Database exported successfully!")
                print(f"\n  File: {output_file}")
                print(f"  Size: {size_mb:.2f} MB")
                
                # Show some stats
                with open(output_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    print(f"  Lines: {len(lines)}")
                
                print("\nYou can now:")
                print(f"  1. Share this file with team members")
                print(f"  2. Store as backup")
                print(f"  3. Import with: python db_backup.py import {os.path.basename(output_file)}")
                
                return output_file
            else:
                self.print_error("Export failed!")
                print(result.stderr)
                return None
        
        except FileNotFoundError:
            self.print_error("pg_dump not found!")
            print("\nPlease install PostgreSQL client tools:")
            print("  Windows: Included with PostgreSQL installation")
            print("  macOS: brew install postgresql")
            print("  Linux: sudo apt-get install postgresql-client")
            return None
        
        except Exception as e:
            self.print_error(f"Export failed: {e}")
            return None
    
    def import_database(self, input_file, clean=False):
        """Import database from SQL file"""
        print("\n" + "="*60)
        print("  Database Import")
        print("="*60 + "\n")
        
        # Check if file exists
        if not os.path.exists(input_file):
            # Try in backup directory
            backup_path = os.path.join(self.backup_dir, input_file)
            if os.path.exists(backup_path):
                input_file = backup_path
            else:
                self.print_error(f"File not found: {input_file}")
                return False
        
        print(f"Source: {input_file}")
        print(f"Target: {self.db_name}\n")
        
        if clean:
            response = input("⚠️  This will DROP all existing tables. Continue? (yes/no): ")
            if response.lower() != 'yes':
                print("Import cancelled.")
                return False
        
        try:
            # Build psql command
            cmd = [
                "psql",
                "-h", self.db_host,
                "-p", self.db_port,
                "-U", self.db_user,
                "-d", self.db_name,
                "-f", input_file
            ]
            
            if clean:
                cmd.extend(["-v", "ON_ERROR_STOP=1"])
            
            # Run psql
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                self.print_success("Database imported successfully!")
                print("\nThe database has been restored.")
                print("\nNext steps:")
                print("  1. Start the application: uvicorn app.main:app --reload")
                print("  2. Verify data: Check http://localhost:8000/docs")
                return True
            else:
                self.print_error("Import failed!")
                print(result.stderr)
                return False
        
        except FileNotFoundError:
            self.print_error("psql not found!")
            print("\nPlease install PostgreSQL client tools")
            return False
        
        except Exception as e:
            self.print_error(f"Import failed: {e}")
            return False
    
    def list_backups(self):
        """List available backups"""
        print("\n" + "="*60)
        print("  Available Backups")
        print("="*60 + "\n")
        
        if not os.path.exists(self.backup_dir):
            print("No backups directory found.")
            return
        
        backups = [f for f in os.listdir(self.backup_dir) if f.endswith('.sql')]
        
        if not backups:
            print("No backups found.")
            print(f"\nCreate a backup with: python db_backup.py export")
            return
        
        backups.sort(reverse=True)  # Newest first
        
        print(f"Found {len(backups)} backup(s):\n")
        
        for i, backup in enumerate(backups, 1):
            filepath = os.path.join(self.backup_dir, backup)
            size = os.path.getsize(filepath)
            size_mb = size / (1024 * 1024)
            mtime = os.path.getmtime(filepath)
            date = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
            
            print(f"{i}. {backup}")
            print(f"   Size: {size_mb:.2f} MB")
            print(f"   Date: {date}")
            print(f"   Path: {filepath}\n")
        
        print("To restore a backup:")
        print(f"  python db_backup.py import {backups[0]}")

def main():
    parser = argparse.ArgumentParser(
        description='Backup and restore Certify database',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Export database
  python db_backup.py export
  python db_backup.py export --output my_backup.sql
  python db_backup.py export --data-only
  
  # Import database
  python db_backup.py import backup_20241230_120000.sql
  python db_backup.py import backup.sql --clean
  
  # List backups
  python db_backup.py list
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # Export command
    export_parser = subparsers.add_parser('export', help='Export database')
    export_parser.add_argument(
        '--output', '-o',
        help='Output filename',
        default=None
    )
    export_parser.add_argument(
        '--data-only',
        action='store_true',
        help='Export data only (no schema)'
    )
    export_parser.add_argument(
        '--schema-only',
        action='store_true',
        help='Export schema only (no data)'
    )
    
    # Import command
    import_parser = subparsers.add_parser('import', help='Import database')
    import_parser.add_argument(
        'input_file',
        help='SQL file to import'
    )
    import_parser.add_argument(
        '--clean',
        action='store_true',
        help='Drop existing tables before import'
    )
    
    # List command
    subparsers.add_parser('list', help='List available backups')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    backup = DatabaseBackup()
    
    if args.command == 'export':
        backup.export_database(
            output_file=args.output,
            data_only=args.data_only,
            schema_only=args.schema_only
        )
    
    elif args.command == 'import':
        backup.import_database(
            input_file=args.input_file,
            clean=args.clean
        )
    
    elif args.command == 'list':
        backup.list_backups()

if __name__ == "__main__":
    main()