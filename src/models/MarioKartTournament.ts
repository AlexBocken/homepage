import mongoose from 'mongoose';

export interface IContestant {
  _id?: string;
  name: string;
  seed?: number; // For bracket seeding
  dnf?: boolean; // Did Not Finish - marked as inactive mid-tournament
}

export interface IRound {
  roundNumber: number;
  scores: Map<string, number>; // contestantId -> score
  completedAt?: Date;
}

export interface IGroupMatch {
  _id?: string;
  contestantIds: string[]; // All contestants in this match
  rounds: IRound[];
  completed: boolean;
}

export interface IGroup {
  _id?: string;
  name: string;
  contestantIds: string[]; // References to contestants
  matches: IGroupMatch[];
  standings?: { contestantId: string; totalScore: number; position: number }[];
}

export interface IBracketMatch {
  _id?: string;
  contestantIds: string[]; // Array of contestant IDs competing in this match
  rounds: IRound[];
  winnerId?: string;
  completed: boolean;
}

export interface IBracketRound {
  roundNumber: number; // 1 = finals, 2 = semis, 3 = quarters, etc.
  name: string; // "Finals", "Semi-Finals", etc.
  matches: IBracketMatch[];
}

export interface IBracket {
  rounds: IBracketRound[];
}

export interface IMarioKartTournament {
  _id?: string;
  name: string;
  status: 'setup' | 'group_stage' | 'bracket' | 'completed';
  contestants: IContestant[];
  groups: IGroup[];
  bracket?: IBracket;
  runnersUpBracket?: IBracket;
  roundsPerMatch: number; // How many rounds in each match
  matchSize: number; // How many contestants compete simultaneously (default 2 for 1v1)
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const RoundSchema = new mongoose.Schema({
  roundNumber: {
    type: Number,
    required: true,
    min: 1
  },
  scores: {
    type: Map,
    of: Number,
    required: true
  },
  completedAt: {
    type: Date
  }
});

const GroupMatchSchema = new mongoose.Schema({
  contestantIds: {
    type: [String],
    required: true
  },
  rounds: {
    type: [RoundSchema],
    default: []
  },
  completed: {
    type: Boolean,
    default: false
  }
});

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  contestantIds: {
    type: [String],
    required: true
  },
  matches: {
    type: [GroupMatchSchema],
    default: []
  },
  standings: [{
    contestantId: String,
    totalScore: Number,
    position: Number
  }]
});

const BracketMatchSchema = new mongoose.Schema({
  contestantIds: {
    type: [String],
    default: [],
    required: false
  },
  rounds: {
    type: [RoundSchema],
    default: []
  },
  winnerId: {
    type: String,
    required: false
  },
  completed: {
    type: Boolean,
    default: false
  }
}, { _id: true, minimize: false });

const BracketRoundSchema = new mongoose.Schema({
  roundNumber: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  matches: {
    type: [BracketMatchSchema],
    required: true
  }
}, { _id: true, minimize: false });

const BracketSchema = new mongoose.Schema({
  rounds: {
    type: [BracketRoundSchema],
    default: []
  }
}, { _id: true, minimize: false });

const ContestantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  seed: {
    type: Number
  },
  dnf: {
    type: Boolean,
    default: false
  }
});

const MarioKartTournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    status: {
      type: String,
      enum: ['setup', 'group_stage', 'bracket', 'completed'],
      default: 'setup'
    },
    contestants: {
      type: [ContestantSchema],
      default: []
    },
    groups: {
      type: [GroupSchema],
      default: []
    },
    bracket: {
      type: BracketSchema
    },
    runnersUpBracket: {
      type: BracketSchema
    },
    roundsPerMatch: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    },
    matchSize: {
      type: Number,
      default: 2,
      min: 2,
      max: 12
    },
    createdBy: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

MarioKartTournamentSchema.index({ createdBy: 1, createdAt: -1 });

export const MarioKartTournament = mongoose.models.MarioKartTournament ||
  mongoose.model<IMarioKartTournament>("MarioKartTournament", MarioKartTournamentSchema);
