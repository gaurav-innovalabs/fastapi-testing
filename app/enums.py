from enum import Enum

class UserRoleEnum(Enum):
    GUEST = 1
    USER = 2
    ADMIN = 3

class CampaignStatusEnum(Enum):
    PENDING = 1
    ACTIVE = 2
    CLOSE = 3