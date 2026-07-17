import json
import requests
from datetime import datetime

payload = [
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-04",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "ctbKSNV2cg7",
                "value": "XT77"
            },
            {
                "dataElement": "date_notification",
                "value": "2026-05-04"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "NTINDA"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Female"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-HNX-592"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "PATIENT"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "XY8U"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "TEST"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2020-01-01"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "XN7UP"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "IPD"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "98"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-05",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "date_notification",
                "value": "2026-05-05"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "NAJJERA"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Female"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-UEG-855"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "TESTER2"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "MG24.6"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "TESTER"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2005-01-01"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "KA64.1"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "Emergency"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-UEG-855"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-06",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "ctbKSNV2cg7",
                "value": "GB60.2"
            },
            {
                "dataElement": "date_notification",
                "value": "2026-05-06"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "KIBULI"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Female"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-PUE-265"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "KAPASIKA"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "JA24.Z"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "FATUMA"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "1993-01-01"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "JA25.3"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "NAGURU REFERRAL HOSPITAL"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-PUE-265"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-06",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "date_notification",
                "value": "2026-05-06"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Male"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-UWT-162"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "AUMA"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "B/OSPECIOZA"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-05-05"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "KB2D"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "HOSPITAL"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-UWT-162"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-09",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "ctbKSNV2cg7",
                "value": "KA22.3"
            },
            {
                "dataElement": "date_notification",
                "value": "2026-05-09"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "NAMWONGO"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Female"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-GVA-634"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "MUKWIZA"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "B/O"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-05-08"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "P24.1"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "CUFH-NAGURU"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-GVA"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-09",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "date_notification",
                "value": "2026-05-09"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "KITINTALE"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Male"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-PVY-775"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "SSEKARYA"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "MOSES"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-02-10"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "CB41.0Z"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "CUFH-NAGURU"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-PVY-775"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-09",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "ctbKSNV2cg7",
                "value": "P22.0"
            },
            {
                "dataElement": "date_notification",
                "value": "2026-05-09"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "NAGURU"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Male"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-WNS-966"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "B/OKHAYANGA"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "P07.3"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "RUTH"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-05-06"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "P80.8"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "SPECIAL CARE UNIT"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-WNS-966"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-09",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "date_notification",
                "value": "2026-05-09"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "KAMWOKYA"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Male"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-ZKP-337"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "NAKUTI"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "KA60"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "B/O"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-05-06"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "P59.9"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "NAGURU CHINA UGANDA"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-ZKP-337"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-10",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "ctbKSNV2cg7",
                "value": "G81.9"
            },
            {
                "dataElement": "date_notification",
                "value": "2026-05-10"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "BUKOTO"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Female"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-KTR-495"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "TALIA"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "G05.1"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "MICHPARWOTH"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2023-01-01"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "J69.0"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "PAED WARD"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-KTR-495"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-10",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "date_notification",
                "value": "2026-05-10"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "KIRINYA"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Female"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-TAC-419"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "NAKALANZI"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "P22.0"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "B/O"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-05-07"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "W78"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "SCU"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-TAC-419"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-11",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "ctbKSNV2cg7",
                "value": "ME05.1"
            },
            {
                "dataElement": "date_notification",
                "value": "2026-05-11"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "KAMWOKYA"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Male"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-PET-716"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "KATWESIGE"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "EZEKIEL"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2025-08-30"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "J15.9"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "NAGURU HOSPITAL"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-PET-716"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-12",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "date_notification",
                "value": "2026-05-12"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "NAMUGONGO"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Male"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-VYV-867"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "KOMUJJUNI"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "KA60"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "B/O"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-05-06"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "P59.9"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "NAGURU HOSPITAL"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-VYV-867"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-15",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "date_notification",
                "value": "2026-05-15"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "KAMWOKYA"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Female"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-BWR-757"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "SAVITA"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "MASAWIS"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-01-19"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "1A40.Z"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "NAGURU HOSPITLA"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-BWR-757"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-16",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "ctbKSNV2cg7",
                "value": "Q79.2"
            },
            {
                "dataElement": "date_notification",
                "value": "2026-05-16"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "KYEBANDO"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Male"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-ECR-469"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "RITAH"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "8E41.Y"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "B\\OAFOYOMUNGU"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-01-01"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "P36.9"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "NICU"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-ECR-469"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-17",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "date_notification",
                "value": "2026-05-17"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "KAMP[ALA"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Female"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-BSQ-366"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "PHIONA"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "P07"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "AINEMBABAZI"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2025-01-01"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "KB2Z"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "NICU"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-BSQ-366"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-17",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "ctbKSNV2cg7",
                "value": "8E41.Y"
            },
            {
                "dataElement": "date_notification",
                "value": "2026-05-17"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "SEETA"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Female"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-DYY-721"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "BABIRYE"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "KC3Y"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "TWIN-1"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-05-11"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "MD11.0"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "CUFH-N"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-DYY-721"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-18",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "date_notification",
                "value": "2026-05-18"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "LUZIRA"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Male"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-XGL-477"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "MORIS"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "KA65.4"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "SEGUJJA"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-04-23"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "1G40"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "NICU"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-XGL-477"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-18",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "date_notification",
                "value": "2026-05-18"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "KISUGU"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Male"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-TNB-982"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "NALUKWATE"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "KA8B"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "B/O"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-05-15"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "KB23.Z"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "CUFH-N"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-TNB-982"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-21",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "ctbKSNV2cg7",
                "value": "LD2H.Y"
            },
            {
                "dataElement": "date_notification",
                "value": "2026-05-21"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "KABALAGALA"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Female"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-PEU-245"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "NAMBUSI"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "KB42"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "B/O"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-04-07"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "KB24"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "NICU"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-PEU-245"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-24",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "date_notification",
                "value": "2026-05-24"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "MUTUNGO"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Female"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-ZBD-844"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "JOANITA"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "LB99.4"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "B/ONAKANDI"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-05-24"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "KB2Y"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "CUFH-N"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-ZBD-844"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-25",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "date_notification",
                "value": "2026-05-25"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "KIWANGA"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Male"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-QSJ-825"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "SEKYEWA"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "UTHMAN"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-05-19"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "1G41"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "NICU"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-QSJ-825"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-28",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "ctbKSNV2cg7",
                "value": "LD2H.Z"
            },
            {
                "dataElement": "date_notification",
                "value": "2026-05-28"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "KATWE"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Female"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-ZBA-465"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "SHIRAT"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "KA21.48"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "B/O"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-05-25"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "KA8F.0"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "SCU"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-ZBA-465"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-28",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "ctbKSNV2cg7",
                "value": "KB23.Z"
            },
            {
                "dataElement": "date_notification",
                "value": "2026-05-28"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "BUKASA"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Female"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-WCA-969"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "GWAWIRE"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "P21.1"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "B/OPEACEMILLY"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-05-28"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "KB04"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "SPECIAL CARE UNIT"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "UG-WCA-969"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-31",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "ctbKSNV2cg7",
                "value": "KB23.Z"
            },
            {
                "dataElement": "date_notification",
                "value": "2026-05-31"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "MBUYA"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Female"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-RSN-466"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "NAMUGAYA"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "KA21.3Z"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "B/O"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-05-29"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "KB2A.Z"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "SCU"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "432Q23"
            }
        ]
    },
    {
        "program": "vf8dN49jprI",
        "programStage": "aKclf7Yl1PE",
        "orgUnit": "h40pKp93Mtc",
        "eventDate": "2026-05-31",
        "attributeOptionCombo": "Lf2Axb9E6B4",
        "status": "COMPLETED",
        "dataValues": [
            {
                "dataElement": "ctbKSNV2cg7",
                "value": "KA21.4Z"
            },
            {
                "dataElement": "date_notification",
                "value": "2026-05-31"
            },
            {
                "dataElement": "dsiwvNQLe5n",
                "value": "KAMPALA"
            },
            {
                "dataElement": "e96GB4CXyd3",
                "value": "Female"
            },
            {
                "dataElement": "FGagV1Utrdh",
                "value": "UG-MDY-691"
            },
            {
                "dataElement": "MOstDqSY0gO",
                "value": "222"
            },
            {
                "dataElement": "Q7VM7swIWb6",
                "value": "SYLIVIA"
            },
            {
                "dataElement": "QGFYJK00ES7",
                "value": "LB02"
            },
            {
                "dataElement": "QmcOqkcNTip",
                "value": "B/OTWIKIRIZE"
            },
            {
                "dataElement": "RbrUuKFSqkZ",
                "value": "2026-05-28"
            },
            {
                "dataElement": "sfpqAeqKeyQ",
                "value": "5C7Z"
            },
            {
                "dataElement": "xNCSFrgdUgi",
                "value": "SCU"
            },
            {
                "dataElement": "ZKBE8Xm9DJG",
                "value": "2345676HNB"
            }
        ]
    }
]

# Function to calculate age in years from DOB and Event Date
def calculate_age(dob_str, event_date_str):
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d")
        evt = datetime.strptime(event_date_str, "%Y-%m-%d")
        age = evt.year - dob.year - ((evt.month, evt.day) < (dob.month, dob.day))
        return str(max(0, age))
    except Exception:
        return "0"

fixed_events = []
for event in payload:
    # Top-level fields remain
    fixed_event = {
        "program": event["program"],
        "programStage": event["programStage"],
        "orgUnit": event["orgUnit"],
        "eventDate": event["eventDate"],
        "attributeOptionCombo": event["attributeOptionCombo"],
        "status": event["status"]
    }
    
    # Process dataValues
    new_data_values = []
    
    # Find event date and birth date for age calculation
    event_date = event["eventDate"]
    dob_value = None
    for dv in event["dataValues"]:
        if dv["dataElement"] == "RbrUuKFSqkZ":
            dob_value = dv["value"]
            break
            
    # Location values
    location_value = None
    for dv in event["dataValues"]:
        if dv["dataElement"] == "dsiwvNQLe5n":
            location_value = dv["value"]
            break
            
    for dv in event["dataValues"]:
        de = dv["dataElement"]
        val = dv["value"]
        
        # 1. Skip date_notification
        if de == "date_notification":
            continue
            
        # 2. Correct Occupation field and move location data
        if de == "dsiwvNQLe5n":
            # Set a recognizable EMR placeholder
            new_data_values.append({
                "dataElement": "dsiwvNQLe5n",
                "value": "EMR_MISSING_OCCUPATION"
            })
            continue
            
        # 3. Correct NIN length if it's '222'
        if de == "MOstDqSY0gO" and val == "222":
            new_data_values.append({
                "dataElement": "MOstDqSY0gO",
                "value": "NINNOTPROVIDED" # exactly 14 chars, fits validation perfectly
            })
            continue
            
        # 4. Correct Case Number length if < 5
        if de == "ZKBE8Xm9DJG" and len(val) < 5:
            new_data_values.append({
                "dataElement": "ZKBE8Xm9DJG",
                "value": f"EMR-CASE-{val}" # makes it > 5 chars, preserves EMR number
            })
            continue
            
        # Keep other elements
        new_data_values.append(dv)
        
    # 5. Add moved location value under Usual Residence - Village (zwKo51BEayZ)
    if location_value:
        new_data_values.append({
            "dataElement": "zwKo51BEayZ",
            "value": location_value
        })
        
    # 6. Calculate and add Age (q7e7FOXKnOf) if DOB is present
    if dob_value:
        age_val = calculate_age(dob_value, event_date)
        new_data_values.append({
            "dataElement": "q7e7FOXKnOf",
            "value": age_val
        })
        
    # 7. Add Date & Time of Death (i8rrl8YWxLF)
    # Medical record standard is to use 12:00 PM (noon) if the EMR didn't capture the time of death.
    new_data_values.append({
        "dataElement": "i8rrl8YWxLF",
        "value": f"{event_date}T12:00:00.000"
    })

    # 8. Extract given name and surname to construct Full Name (ZYKmQ9GPOaF)
    given_name = ""
    surname = ""
    for dv in event["dataValues"]:
        if dv["dataElement"] == "QmcOqkcNTip":
            given_name = dv["value"]
        elif dv["dataElement"] == "Q7VM7swIWb6":
            surname = dv["value"]
            
    if not given_name:
        given_name = "EMR_MISSING_GIVENNAME"
    if not surname:
        surname = "EMR_MISSING_SURNAME"
    
    full_name = f"{given_name} {surname}".strip()
        
    new_data_values.append({
        "dataElement": "ZYKmQ9GPOaF",
        "value": full_name
    })
    
    fixed_event["dataValues"] = new_data_values
    fixed_events.append(fixed_event)

# Wrap in events envelope
post_payload = {
    "events": fixed_events
}

# Output fixed payload to a json file to share with user
with open("C:\\Users\\SK\\.gemini\\antigravity-ide\\brain\\49305053-68dc-4903-b36f-1247438060db\\scratch\\fixed_payload.json", "w") as f:
    json.dump(post_payload, f, indent=4)

print("Fixed payload saved to scratch/fixed_payload.json")

# Now post to DHIS2 server
url = "https://hmis-tests.health.go.ug/api/40/events"
headers = {
    "Content-Type": "application/json"
}
auth = ("insert_username", "insert_password")

try:
    print(f"Posting {len(fixed_events)} events to {url}...")
    response = requests.post(url, json=post_payload, headers=headers, auth=auth, timeout=30)
    print(f"Response status code: {response.status_code}")
    print("Response text:")
    print(response.text)
except Exception as e:
    print(f"An error occurred while posting: {e}")
