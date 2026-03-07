import {Box, CardContent, Divider, Grid, Skeleton} from "@mui/material";
import CustomCard from "@/components/customs/custom-card.tsx";

const ViewUserSkeleton = () => {
    return (
        <Box>
            <Grid container spacing={3}>
                <Grid size={12}>
                    <CustomCard>
                        <CardContent sx={{textAlign: "center", p: 1}}>
                            <Skeleton variant="circular" width={120} height={120} sx={{margin: "auto", mb: 2}}/>
                            <Skeleton variant="text" height={32} width="80%" sx={{mx: "auto"}}/>
                            <Skeleton variant="text" height={24} width="60%" sx={{mx: "auto", mb: 1.5}}/>
                            <Skeleton
                                variant="rectangular"
                                height={24}
                                width={80}
                                sx={{mx: "auto", borderRadius: "16px"}}
                            />
                        </CardContent>
                        <Divider/>
                        <Box sx={{p: 2, display: "flex", flexDirection: "column", gap: 1}}>
                            <Skeleton variant="rectangular" height={40} sx={{borderRadius: 1}}/>
                            <Skeleton variant="rectangular" height={40} sx={{borderRadius: 1}}/>
                        </Box>
                    </CustomCard>
                </Grid>

                <Grid size={12}>
                    <CustomCard>
                        <CardContent sx={{p: 1}}>
                            <Skeleton variant="text" height={32} width="50%" sx={{mb: 3}}/>
                            <Grid container spacing={3}>
                                {[...Array(6)].map((_, index) => (
                                    <Grid size={{xs: 12, sm: 6}} key={index}>
                                        <Skeleton variant="text" height={20} width="40%"/>
                                        <Skeleton variant="text" height={28} width="70%"/>
                                    </Grid>
                                ))}
                            </Grid>
                        </CardContent>
                    </CustomCard>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ViewUserSkeleton;
